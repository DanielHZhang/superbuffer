import {BufferManager} from './buffer';
import {Schema} from './schema';
import type {SchemaData, SchemaDefinition, SchemaObject, TypedArrayName} from './types';
import {getTypedArrayByName, isBufferView, isObject} from './utils';
import {uint16, uint8} from './views';

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
    struct: SchemaDefinition<T>,
    id?: number
  ): Model<T> {
    return new Model(new Schema<T>(struct, id));
  }

  /**
   * Extract the root Model id from the ArrayBuffer.
   * @param buffer The ArrayBuffer from which to extract the id.
   */
  public static getIdFromBuffer(buffer: ArrayBuffer): number {
    return new Uint8Array(buffer)[1];
  }

  /**
   * Serialize an object or an array of objects defined by this Model's schema into an ArrayBuffer.
   * @param data The object or array of objects to be serialized.
   */
  public toBuffer(data: SchemaData<T>): ArrayBuffer;
  public toBuffer(data: SchemaData<T>, encoding: 'Uint8'): Uint8Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Uint16'): Uint16Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Uint32'): Uint32Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Int8'): Int8Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Int16'): Int16Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Int32'): Int32Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Float32'): Float32Array;
  public toBuffer(data: SchemaData<T>, encoding: 'Float64'): Float64Array;
  public toBuffer(data: SchemaData<T>, encoding: 'BigInt64'): BigInt64Array;
  public toBuffer(data: SchemaData<T>, encoding: 'BigUint64'): BigUint64Array;
  public toBuffer(
    data: SchemaData<T>,
    encoding?: TypedArrayName
  ):
    | ArrayBuffer
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array {
    this._buffer.refresh();
    if (Array.isArray(data)) {
      this._buffer.append(uint8, Model.BUFFER_ARRAY);
      this._buffer.append(uint8, this.schema.id);
      this._buffer.append(uint16, data.length);
      for (let i = 0; i < data.length; i++) {
        this.serialize(data[i], this.schema.struct);
      }
    } else {
      this._buffer.append(uint8, Model.BUFFER_OBJECT);
      this._buffer.append(uint8, this.schema.id);
      this.serialize(data, this.schema.struct);
    }
    if (encoding) {
      const TypedArray = getTypedArrayByName(encoding);
      return new TypedArray(this._buffer.internal, 0, this._buffer.offset);
    }
    return this._buffer.internal.slice(0, this._buffer.offset);
  }

  /**
   * Deserialize an ArrayBuffer to reconstruct the original object or array of objects defined by
   * the schema of this Model.
   * @param buffer The ArrayBuffer to be deserialized.
   * @param expect The expected buffer type (i.e. `Model.BUFFER_OBJECT) for deserialization.
   */
  public fromBuffer(buffer: ArrayBuffer | ArrayBufferView): SchemaData<T>;
  public fromBuffer(
    buffer: ArrayBuffer | ArrayBufferView,
    expect: typeof Model.BUFFER_OBJECT
  ): SchemaObject<T>;
  public fromBuffer(
    buffer: ArrayBuffer | ArrayBufferView,
    expect: typeof Model.BUFFER_ARRAY
  ): SchemaObject<T>[];
  public fromBuffer(buffer: ArrayBuffer | ArrayBufferView, expect?: number): SchemaData<T> {
    if (ArrayBuffer.isView(buffer)) {
      buffer = buffer.buffer; // Access internal ArrayBuffer of ArrayBufferView
    }
    if (buffer.byteLength > this._buffer.maxByteSize) {
      throw new Error('Buffer exceeds max allocation size.');
    }
    this._buffer.refresh(buffer);

    // Determine if structure is object or array
    const bufferType = this._buffer.read(uint8);
    if (expect && expect !== bufferType) {
      throw new Error(`Expected buffer type to be ${expect} but got ${bufferType}.`);
    }
    if (this._buffer.read(uint8) !== this.schema.id) {
      throw new Error(`Expected schema id to be ${this.schema.id}`);
    }

    // Handle object
    if (bufferType === Model.BUFFER_OBJECT) {
      return this.deserialize(this.schema.struct) as SchemaObject<T>;
    }
    // Handle array
    const numElements = this._buffer.read(uint16);
    const results: SchemaObject<T>[] = [];
    for (let i = 0; i < numElements; i++) {
      results.push(this.deserialize(this.schema.struct) as SchemaObject<T>);
    }
    return results;
  }

  /**
   * Serialize data that adheres to the provided object structure.
   * @param data Data to be serialized.
   * @param struct Object structure in the schema definition.
   */
  protected serialize(data: Record<string, any>, struct: Record<string, any>): void {
    const keys = Object.keys(struct);
    for (let i = 0; i < keys.length; i++) {
      const dataProp = data[keys[i]]; // Actual data values
      const schemaProp = struct[keys[i]]; // Corresponds with values from schema
      // BufferView
      if (isBufferView(schemaProp)) {
        this._buffer.append(schemaProp, dataProp);
      }
      // Schema
      else if (schemaProp instanceof Schema) {
        this.serialize(dataProp, schemaProp.struct);
      }
      // Array
      else if (Array.isArray(schemaProp)) {
        this._buffer.append(uint16, dataProp.length);
        const element = schemaProp[0];
        // Schema
        if (element instanceof Schema) {
          for (let i = 0; i < dataProp.length; i++) {
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
      // Object
      else if (isObject(schemaProp)) {
        this.serialize(dataProp, schemaProp);
      }
    }
  }

  /**
   * Deserialize data from the ArrayBuffer that adheres to the provided object structure.
   * @param struct Object structure in the schema definition.
   */
  protected deserialize(struct: Record<string, any>): Record<string, any> {
    const data: Record<string, any> = {};
    const keys = Object.keys(struct);
    for (let i = 0; i < keys.length; i++) {
      const structValue = struct[keys[i]];
      // BufferView definition
      if (isBufferView(structValue)) {
        data[keys[i]] = this._buffer.read(structValue);
      }
      // Array definition
      else if (Array.isArray(structValue)) {
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
        data[keys[i]] = this.deserialize(
          structValue instanceof Schema ? structValue.struct : structValue
        );
      }
    }
    return data;
  }
}
