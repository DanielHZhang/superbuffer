import {Schema} from './schema';
import {string, uint} from './views';
import {isObject, isStringOrNumber, isBufferView} from './utils';
import type {BufferView, SchemaObject, SchemaDefinition, Serializable} from './types';

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
   * Max buffer size for a single serialized object of 512 kibibytes.
   */
  protected static readonly MAX_BUFFER_SIZE = 512 * 1024; // TODO: potentially make adjustable

  /**
   * Identifier for the start position of serialized plain objects.
   */
  protected static readonly OBJECT_HEADER = 61312;

  /**
   * Identifier for the start position of serialized arrays.
   */
  protected static readonly ARRAY_HEADER = 48364;

  /**
   * Identifier for the start position of serialized schema objects.
   */
  protected static readonly SCHEMA_HEADER = 46670;

  /**
   * Internal ArrayBuffer reference.
   */
  protected _buffer: ArrayBuffer;

  /**
   * Current byte position in the DataView.
   */
  protected _bytes: number;

  /**
   * Internal DataView reference.
   */
  protected _dataView: DataView;

  /**
   * Internal Schema that this model instance is defined by.
   */
  protected _schema: Schema<T>;

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
    this._bytes = 0;
    this._buffer = new ArrayBuffer(this._bytes);
    this._dataView = new DataView(this._buffer);
    this._schema = schema;
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
    this.refresh();

    // Array
    if (Array.isArray(objectOrArray)) {
      this.appendDataView(uint(8), Model.BUFFER_ARRAY);
      this.appendDataView(string(8), this._schema.id);
      for (let i = 0; i < objectOrArray.length; i++) {
        this.serialize(objectOrArray[i], this._schema.struct);
      }
    }
    // Object
    else {
      this.appendDataView(uint(8), Model.BUFFER_OBJECT);
      this.appendDataView(string(8), this._schema.id);
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
    const int8Array = new Int8Array(buffer);

    // Determine if structure is object or array
    const header = int8Array[0];
    if (expect && expect !== header) {
      throw new Error(`Expected ArrayBuffer structure ${expect} but got ${header}.`);
    }

    // Ensure the root model id matches this model
    if (this.readHeaderId(int8Array, 1) !== this._schema.id) {
      throw new Error("ArrayBuffer id does not match the id of this model's schema.");
    }

    // Handle object
    if (header === Model.BUFFER_OBJECT) {
      // Start at position after the root id
      this.deserialize(this._schema.struct, dataView, int8Array, 5);
    }
    // Handle array
    else {
      //
    }

    const data: any = {}; // holds all the data we want to give back
    const bytesRef = {bytes: 0}; // The current byte position of the ArrayBuffer
    const dataPerSchema: any = {};

    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i];
      const next = schemas[i + 1];
      const end = next?.startsAt ? next.startsAt - 5 : buffer.byteLength;

      console.log('what is the schema:', schema);

      // bytes is not accurate since it includes child schemas
      const length = schema.bytes || 1;

      // Determine the number of iterations for an array of items (e.g. 5 objects = 5 iterations)
      const iterations = Math.floor((end - schema.startsAt!) / length);
      console.log('iterations:', iterations);

      // No iterations, this is the root schema or a {prop: Schema}
      // if (iterations === 0) {
      //   bytesRef.bytes = schema.startsAt! + length;
      //   console.log('deserializing iteration 0:', schema.deserialize(view, bytesRef));
      // }

      for (let j = 0; j < iterations; j++) {
        bytesRef.bytes = schema.startsAt! + j * length;

        const schemaData = schema.deserialize(dataView, bytesRef);

        if (iterations <= 1) {
          dataPerSchema[schema.id] = {...schemaData};
        } else {
          if (typeof dataPerSchema[schema.id] === 'undefined') {
            dataPerSchema[schema.id] = [];
          }
          dataPerSchema[schema.id].push(schemaData);
        }
      }
    }

    return data;
  }

  protected deserialize(
    struct: Record<string, any>,
    dataView: DataView,
    int8Array: Int8Array,
    startPosition: number
  ): {data: Record<string, any>; position: number} {
    const data: Record<string, any> = {};
    const keys = Object.keys(struct);
    let position = startPosition;

    for (let i = 0; i < keys.length; i++) {
      const structValue = struct[keys[i]];
      // BufferView definition
      if (isBufferView(structValue)) {
        // const bytesToRead = structValue.bytes;
        data[keys[i]] = this.readDataView(dataView, structValue, position);
        position += structValue.bytes;
      }
      // Array definition
      else if (Array.isArray(structValue)) {
        // Determine if there is anything after this array in the buffer
        // Header identifier starts with ^, which is char code 94.
        let next = int8Array.indexOf(94, position);
        if (next < 0) {
          // End of buffer
          next = int8Array.byteLength;
        }

        // Confirm there is an array at the current position
        if (this.readHeaderId(int8Array, position) !== Model.ARRAY_HEADER) {
          throw new Error(`Expected array header at position ${position}`);
        }
        position += 4;

        const element = structValue[0];
        const result = [];
        if (element instanceof Schema) {
          // const result: SchemaObject<any>[] = [];
          while (position < next) {
            const complete = this.deserialize(element.struct, dataView, int8Array, position);
          }

          // Read the schema id
        } else if (isBufferView(element)) {
          // const result: (number | string | bigint)[] = [];
          for (let i = position; i < next; i++) {
            result.push(this.readDataView(dataView, element, i));
          }
          data[keys[i]] = result;
          position = next;
        }
      }
      // Schema definition
      else if (structValue instanceof Schema) {
        structValue;
      }
      // Object definition
      else if (isObject(structValue)) {
      }
    }

    return {data, position};
  }

  protected readHeaderId(int8Array: Int8Array, position: number): string {
    // const headerChar = this.readDataView(dataView, uint(8), position);
    // if (typeof headerChar !== 'number' || headerChar !== 94) {
    //   throw new Error(
    //     `Expected array header to begin at position ${position} but got ${headerChar}.`
    //   );
    // }
    // const codes: number[] = [];
    // for (let i = 0; i < 5; i++) {}
    return String.fromCharCode(...int8Array.slice(position, position + 4));
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
      if (isBufferView(schemaProp) && isStringOrNumber(dataProp)) {
        this.appendDataView(schemaProp, dataProp);
      }
      // Schema
      else if (schemaProp instanceof Schema && isObject(dataProp)) {
        this.appendDataView(uint(16), Model.SCHEMA_HEADER);
        this.appendDataView(uint(8), schemaProp.id); // Serialize schema id before data
        this.serialize(dataProp, schemaProp.struct);
      }
      // Object
      else if (isObject(schemaProp) && isObject(dataProp)) {
        this.appendDataView(uint(16), Model.OBJECT_HEADER); // Serialize object header before data
        this.serialize(dataProp, schemaProp);
      }
      // Array
      else if (Array.isArray(schemaProp) && Array.isArray(dataProp)) {
        this.appendDataView(uint(16), Model.ARRAY_HEADER); // Serialize array header before data
        const element = schemaProp[0];
        // Schema
        if (element instanceof Schema) {
          for (let i = 0; i < dataProp.length; i++) {
            this.appendDataView(uint(16), Model.SCHEMA_HEADER);
            this.appendDataView(uint(8), element.id);
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

  /**
   * Read the DataView at the specified position according to the BufferView type.
   * @param dataView DataView to be read.
   * @param bufferView BufferView to define the type read.
   * @param position Position in the DataView where to read.
   */
  protected readDataView(
    dataView: DataView,
    bufferView: BufferView,
    position: number
  ): Serializable {
    if (bufferView.type === 'String8' || bufferView.type === 'String16') {
      let value = '';
      for (let i = 0; i < 12; i++) {
        value += String.fromCharCode(
          dataView[`get${bufferView.type === 'String8' ? 'Uint8' : 'Uint16'}` as const](position)
        );
      }
      return value;
    }
    return dataView[`get${bufferView.type}` as const](position);
  }

  /**
   * Append data to this model's DataView buffer.
   * @param bufferView BufferView to define the type appended.
   * @param data Data to be appended to the DataView.
   */
  protected appendDataView<T extends Serializable>(bufferView: BufferView<T>, data: T): void {
    if (bufferView.type === 'String8' || bufferView.type === 'String16') {
      if (typeof data === 'string') {
        // Crop strings to default length of 12 characters
        // const cropped = cropString(data, 12);
        for (let i = 0; i < data.length; i++) {
          this._dataView[`set${bufferView.type === 'String8' ? 'Uint8' : 'Uint16'}` as const](
            this._bytes,
            data.charCodeAt(i)
          );
          this._bytes += bufferView.bytes;
        }
      }
    } else {
      if (typeof data === 'number') {
        if (bufferView.type === 'BigInt64' || bufferView.type === 'BigUint64') {
          this._dataView[`set${bufferView.type}` as const](this._bytes, BigInt(data));
        } else {
          this._dataView[`set${bufferView.type}` as const](this._bytes, data);
        }
        this._bytes += bufferView.bytes; // Increment the bytes
      }
    }
  }

  /**
   * Refresh this Model's internal buffer and DataView before toBuffer is called.
   */
  protected refresh(): void {
    this._buffer = new ArrayBuffer(Model.MAX_BUFFER_SIZE);
    this._dataView = new DataView(this._buffer);
    this._bytes = 0;
  }
}
