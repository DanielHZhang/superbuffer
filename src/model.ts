import {BufferManager} from './buffer';
import {ARRAY_HEADER, OBJECT_HEADER, SCHEMA_HEADER} from './constants';
import {Schema} from './schema';
import {uint16, uint8} from './views';
import {isObject, isSerializable, isBufferView} from './utils';
import type {SchemaObject, SchemaDefinition} from './types';

/**
 * The Model class provides an API for serializing and deserializing ArrayBuffers into objects
 * specified by their Schema definitions.
 */
export class Model<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Unique identifier denoting the buffer's structure is an array of flattened hashmaps.
   */
  public static readonly BUFFER_ARRAY = 0;
  /**
   * Unique identifier denoting the buffer's structure is a flattened hashmap.
   */
  public static readonly BUFFER_OBJECT = 1;
  /**
   * Schema definition reference.
   */
  public readonly schema: Schema<T>;
  /**
   * Internal BufferManager reference.
   */
  protected readonly _buffer: BufferManager;

  /**
   * Create a new Model instance.
   * @param schema Schema instance that this model is defined by.
   * @param bufferSize The maximum size of serializable data. Default: 1 megabyte.
   */
  public constructor(schema: Schema<T>, bufferSize?: number) {
    this._buffer = new BufferManager(bufferSize);
    this.schema = schema;
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
  public static getIdFromBuffer(buffer: ArrayBuffer): number {
    const dataView = new DataView(buffer);
    return dataView.getUint8(3);
  }

  /**
   * Serialize an object or an array of objects defined by this Model's schema into an ArrayBuffer.
   * @param objectOrArray The object or array of objects to be serialized.
   */
  public toBuffer(objectOrArray: SchemaObject<T> | SchemaObject<T>[]): ArrayBuffer {
    this._buffer.refresh();
    if (Array.isArray(objectOrArray)) {
      this._buffer.append(uint8, Model.BUFFER_ARRAY);
      this._buffer.append(uint16, SCHEMA_HEADER);
      this._buffer.append(uint8, this.schema.id);
      for (let i = 0; i < objectOrArray.length; i++) {
        this.serialize(objectOrArray[i], this.schema.struct);
      }
    } else {
      this._buffer.append(uint8, Model.BUFFER_OBJECT);
      this._buffer.append(uint16, SCHEMA_HEADER);
      this._buffer.append(uint8, this.schema.id);
      // console.log('before serialize:', this._buffer._buffer, this._buffer.offset);
      // console.log('before serialize of:', this._buffer._dataView.getUint16(1));
      this.serialize(objectOrArray, this.schema.struct);
      // console.log('after serialize:', this._buffer._buffer, this._buffer.offset);
    }
    return this._buffer.finalize();
  }

  /**
   * Deserialize an ArrayBuffer to reconstruct the original object or array of objects defined by
   * the schema of this Model.
   * @param buffer The ArrayBuffer to be deserialized.
   * @param expect The expected buffer type (i.e. `Model.BUFFER_OBJECT) for deserialization.
   */
  public fromBuffer(buffer: ArrayBuffer): SchemaObject<T> | SchemaObject<T>[];
  public fromBuffer(buffer: ArrayBuffer, expect: typeof Model.BUFFER_OBJECT): SchemaObject<T>;
  public fromBuffer(buffer: ArrayBuffer, expect: typeof Model.BUFFER_ARRAY): SchemaObject<T>[];
  public fromBuffer(buffer: ArrayBuffer, expect?: number): SchemaObject<T> | SchemaObject<T>[] {
    this._buffer.refresh(buffer);

    // console.log('offset:', this._buffer.offset);
    // console.log('header:', this._buffer._dataView.getUint8(this._buffer.offset));

    // Determine if structure is object or array
    const header = this._buffer.read(uint8);
    if (expect && expect !== header) {
      throw new Error(`Expected ArrayBuffer structure ${expect} but got ${header}.`);
    }

    // Ensure the root model id matches this model
    // console.log('offset:', this._buffer.offset);
    // console.log('schemaheader:', this._buffer._dataView.getUint16(this._buffer.offset));
    // console.log('id:', this.schema.id, this._buffer._dataView.getUint8(this._buffer.offset + 2));
    // console.log('arbuf:', this._buffer._buffer);
    if (
      this._buffer.read(uint16) !== SCHEMA_HEADER ||
      this._buffer.read(uint8) !== this.schema.id
    ) {
      throw new Error("ArrayBuffer id does not match the id of this model's schema.");
    }

    // Handle object
    if (header === Model.BUFFER_OBJECT) {
      // Start at position after the root id
      return this.deserialize(this.schema.struct) as SchemaObject<T>;
    }
    // Handle array
    else {
      return [] as SchemaObject<T>[];
    }
  }

  protected deserialize(struct: Record<string, any>): Record<string, any> {
    const data: Record<string, any> = {};
    const keys = Object.keys(struct);
    // let position = startPosition;

    for (let i = 0; i < keys.length; i++) {
      const structValue = struct[keys[i]];
      console.log('struct val:', keys[i], structValue);
      // BufferView definition
      if (isBufferView(structValue)) {
        data[keys[i]] = this._buffer.read(structValue);
      }
      // Array definition
      else if (Array.isArray(structValue)) {
        // Confirm there is an array at the current position
        if (this._buffer.read(uint16) !== ARRAY_HEADER) {
          throw new Error(`Expected array header at position ${this._buffer.offset - 2}`);
        }
        const numElements = this._buffer.read(uint16);
        const element = structValue[0];
        const results = [];
        if (element instanceof Schema) {
          for (let i = 0; i < numElements; i++) {
            results.push(this.deserialize(element.struct));
          }
        } else if (isBufferView(element)) {
          for (let i = 0; i < numElements; i++) {
            results.push(this._buffer.read(element));
          }
        }
        data[keys[i]] = results;
      }
      // Schema or object definition
      else {
        let struct = structValue;
        if (structValue instanceof Schema) {
          if (
            this._buffer.read(uint16) !== SCHEMA_HEADER ||
            this._buffer.read(uint8) !== structValue.id
          ) {
            throw new Error(`Expected schema header at position ${this._buffer.offset - 3}`);
          }
          struct = structValue.struct;
        } else {
          if (this._buffer.read(uint16) !== OBJECT_HEADER) {
            throw new Error(`Expected object header at position ${this._buffer.offset - 2}`);
          }
        }
        data[keys[i]] = this.deserialize(struct);
      }
    }
    console.log('should return:', data);
    return data;
  }

  /**
   * Serialize data that adheres to the provided object structure.
   * @param data Data to be serialized.
   * @param struct SchemaDefinition structure.
   */
  protected serialize(data: Record<string, any>, struct: Record<string, any>): void {
    const keys = Object.keys(struct);
    for (let i = 0; i < keys.length; i++) {
      const dataProp = data[keys[i]]; // Actual data values
      const schemaProp = struct[keys[i]]; // Corresponds with values from schema
      // BufferView
      if (isBufferView(schemaProp) && isSerializable(dataProp)) {
        this._buffer.append(schemaProp, dataProp);
      }
      // Schema
      else if (schemaProp instanceof Schema && isObject(dataProp)) {
        this._buffer.append(uint16, SCHEMA_HEADER);
        this._buffer.append(uint8, schemaProp.id); // Serialize schema id before data
        this.serialize(dataProp, schemaProp.struct);
      }
      // Object
      else if (isObject(schemaProp) && isObject(dataProp)) {
        this._buffer.append(uint16, OBJECT_HEADER); // Serialize object header before data
        this.serialize(dataProp, schemaProp);
      }
      // Array
      else if (Array.isArray(schemaProp) && Array.isArray(dataProp)) {
        this._buffer.append(uint16, ARRAY_HEADER); // Serialize array header before data
        this._buffer.append(uint16, dataProp.length); // Serialize the number of elements
        const element = schemaProp[0];
        // Schema
        if (element instanceof Schema) {
          for (let i = 0; i < dataProp.length; i++) {
            this._buffer.append(uint16, SCHEMA_HEADER);
            this._buffer.append(uint8, element.id);
            this.serialize(dataProp[i], element.struct);
          }
        }
        // BufferView
        else if (isBufferView(element)) {
          for (let i = 0; i < dataProp.length; i++) {
            this._buffer.append(element, dataProp[i]);
          }
        }
      }
      // Unsupported data type
      else {
        throw new Error('Unsupported data type does not conform to schema definition.');
      }
    }
  }
}
