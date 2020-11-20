import {Schema} from './schema';
import {int16, string8, uint16, uint8} from './views';
import {isObject, isSerializable, isBufferView} from './utils';
import type {BufferView, SchemaObject, SchemaDefinition, Serializable} from './types';
import {BufferManager} from './buffer';

export class Model<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Unique identifier denoting the buffer's structure is a flattened hashmap.
   */
  public static readonly BUFFER_OBJECT = 1;

  /**
   * Unique identifier denoting the buffer's structure is an array of flattened hashmaps.
   */
  public static readonly BUFFER_ARRAY = 2;

  /**
   * Internal Schema that this model instance is defined by.
   */
  protected _schema: Schema<T>;

  protected _buffer: BufferManager;

  /**
   * Get the schema definition.
   */
  public get schema(): Schema {
    return this._schema;
  }

  /**
   * Get the id of the Schema.
   */
  public get id(): number {
    return this._schema.id;
  }

  /**
   * Create a new Model instance with the specified Schema instance.
   * @param schema Schema instance that this model is defined by.
   */
  public constructor(schema: Schema<T>) {
    this._schema = schema;
    this._buffer = new BufferManager();
  }

  /**
   * Create a Model directly from the provided schema name and definition.
   * @param name Unique name of the schema.
   * @param struct Structure of the schema.
   */
  public static fromSchemaDefinition<T extends Record<string, unknown>>(
    name: string,
    struct: SchemaDefinition<T>
  ): Model<T> {
    return new Model(new Schema<T>(name, struct));
  }

  /**
   * Extract the root Model id from the ArrayBuffer.
   * @param buffer The ArrayBuffer from which to extract the id.
   */
  public static getIdFromBuffer(buffer: ArrayBuffer): string {
    const dataView = new DataView(buffer);
    const header = dataView.getUint8(0);
    let id = '';
    for (let i = 1; i < 6; i++) {
      const uInt8 = dataView.getUint8(i);
      id += String.fromCharCode(uInt8);
    }
    if (header !== Model.BUFFER_ARRAY && header !== Model.BUFFER_OBJECT && !id.startsWith('#')) {
      throw new Error('Invalid ArrayBuffer structure.');
    }
    return id;
  }

  /**
   * Serialize an object or an array of objects defined by this Model's schema into an ArrayBuffer.
   * @param objectOrArray The object or array of objects to be serialized.
   */
  public toBuffer(objectOrArray: SchemaObject<T> | SchemaObject<T>[]): ArrayBuffer {
    this._buffer.refresh();

    // Array
    if (Array.isArray(objectOrArray)) {
      this.appendDataView(uint8, Model.BUFFER_ARRAY);
      this.appendDataView(uint8, this._schema.id);
      for (let i = 0; i < objectOrArray.length; i++) {
        this.serialize(objectOrArray[i], this._schema.struct);
      }
    }
    // Object
    else {
      this.appendDataView(uint8, Model.BUFFER_OBJECT);
      this.appendDataView(uint8, this._schema.id);
      this.serialize(objectOrArray, this._schema.struct);
    }

    // Copy into new buffer
    const newBuffer = new ArrayBuffer(this._bytes);
    const newDataView = new DataView(newBuffer);
    for (let i = 0; i < this._bytes; i++) {
      newDataView.setUint8(i, this._dataView.getUint8(i));
    }
    return newBuffer;
  }

  /**
   * Deserialize an ArrayBuffer to reconstruct the original object or array of objects defined by
   * the schema of this Model.
   * @param buffer The ArrayBuffer to be deserialized.
   * @param expect The expected buffer type (i.e. `Model.BUFFER_OBJECT) for deserialization.
   */
  public fromBuffer(buffer: ArrayBuffer): T | T[];
  public fromBuffer(buffer: ArrayBuffer, expect: typeof Model.BUFFER_OBJECT): T;
  public fromBuffer(buffer: ArrayBuffer, expect: typeof Model.BUFFER_ARRAY): T[];
  public fromBuffer(buffer: ArrayBuffer, expect?: number): T | T[] {
    const dataView = new DataView(buffer);

    // Determine if structure is object or array
    const header = dataView.getUint8(0);
    if (expect && expect !== header) {
      throw new Error(`Expected ArrayBuffer structure ${expect} but got ${header}.`);
    }

    // Ensure the root model id matches this model
    if (dataView.getUint16(1) !== Model.SCHEMA_HEADER || dataView.getUint8(3) !== this._schema.id) {
      throw new Error("ArrayBuffer id does not match the id of this model's schema.");
    }

    // Handle object
    if (header === Model.BUFFER_OBJECT) {
      // Start at position after the root id
      return this.deserialize(this._schema.struct, dataView, 4).data as T;
    }
    // Handle array
    else {
      return [] as T[];
    }
  }

  protected deserialize(
    struct: Record<string, any>,
    dataView: DataView,
    startPosition: number
  ): {data: Record<string, any>; position: number} {
    const data: Record<string, any> = {};
    const keys = Object.keys(struct);
    let position = startPosition;

    for (let i = 0; i < keys.length; i++) {
      const structValue = struct[keys[i]];
      // BufferView definition
      if (isBufferView(structValue)) {
        if (structValue.type === 'String8' || structValue.type === 'String16') {
          const result = this.readDataViewString(dataView, structValue, position);
          data[keys[i]] = result.data;
          position = result.position;
        } else {
          data[keys[i]] = this.readDataView(dataView, structValue, position);
          position += structValue.bytes;
        }
      }
      // Array definition
      else if (Array.isArray(structValue)) {
        // Confirm there is an array at the current position
        if (this.readDataView(dataView, uint16, position) !== Model.ARRAY_HEADER) {
          throw new Error(`Expected array header at position ${position}`);
        }
        position += uint16.bytes;
        const element = structValue[0];
        const result = [];
        if (element instanceof Schema) {
          while (position < dataView.byteLength) {
            const complete = this.deserialize(element.struct, dataView, position);
            result.push(complete.data);
            position = complete.position;
            // Array has ended if no schema header with schema id
            if (
              this.readDataView(dataView, uint16, complete.position) !== Model.SCHEMA_HEADER ||
              this.readDataView(dataView, uint8, complete.position + 2) !== element.id
            ) {
              break;
            }
          }
          data[keys[i]] = result;
        }
        // BufferView
        else if (isBufferView(element)) {
          for (let i = position; i < dataView.byteLength; i++) {
            const current = this.readDataView(dataView, element, i);
            if (this.isHeader(current)) {
              data[keys[i]] = result;
              position = i;
              break;
            } else {
              result.push(current);
            }
          }
        }
      }
      // Schema or object definition
      else {
        let struct = structValue;
        if (structValue instanceof Schema) {
          if (
            this.readDataView(dataView, uint16, position) !== Model.SCHEMA_HEADER ||
            this.readDataView(dataView, uint8, position + 2) !== structValue.id
          ) {
            throw new Error(`Expected schema header at position ${position}`);
          }
          position += 3;
          struct = structValue.struct;
        } else {
          if (this.readDataView(dataView, uint16, position) !== Model.OBJECT_HEADER) {
            throw new Error(`Expected object header at position ${position}`);
          }
          position += 2;
        }
        const complete = this.deserialize(struct, dataView, position);
        data[keys[i]] = complete.data;
        position = complete.position;
      }
    }

    return {data, position};
  }

  /**
   * Serialize data that adheres to the provided object structure.
   * @param data Data to be serialized.
   * @param struct SchemaDefinition structure.
   */
  protected serialize(data: Record<string, any>, struct: Record<string, any>): void {
    for (const key of Object.keys(struct)) {
      const dataProp = data[key]; // Actual data values
      const schemaProp = struct[key]; // Corresponds with values from schema
      // ArrayView
      if (isBufferView(schemaProp) && isSerializable(dataProp)) {
        this._buffer.append(schemaProp, dataProp);
      }
      // Schema
      else if (schemaProp instanceof Schema && isObject(dataProp)) {
        this.appendDataView(uint16, Model.SCHEMA_HEADER); // Serialize schema id before data
        this.appendDataView(uint8, schemaProp.id);
        this.serialize(dataProp, schemaProp.struct);
      }
      // Object
      else if (isObject(schemaProp) && isObject(dataProp)) {
        this.appendDataView(uint16, Model.OBJECT_HEADER); // Serialize object header before data
        this.serialize(dataProp, schemaProp);
      }
      // Array
      else if (Array.isArray(schemaProp) && Array.isArray(dataProp)) {
        this.appendDataView(uint16, Model.ARRAY_HEADER); // Serialize array header before data
        const element = schemaProp[0];
        // Schema
        if (element instanceof Schema) {
          for (let i = 0; i < dataProp.length; i++) {
            this.appendDataView(uint16, Model.SCHEMA_HEADER);
            this.appendDataView(uint8, element.id);
            this.serialize(dataProp[i], element.struct);
          }
        }
        // BufferView
        else {
          for (let i = 0; i < dataProp.length; i++) {
            this.appendDataView(element, dataProp[i]);
          }
        }
      } else {
        throw new Error('Unsupported data type does not conform to schema definition.');
      }
    }
  }
}
