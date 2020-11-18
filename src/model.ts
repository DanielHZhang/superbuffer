import {Schema} from './schema';
import {string, uint} from './views';
import {isObject, isStringOrNumber, isBufferView} from './utils';
import type {BufferView, SchemaObject, SchemaDefinition} from './types';

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
  protected static readonly MAX_BUFFER_SIZE = 512 * 1024;

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
   * Get the ID of the schema definition.
   */
  public get id(): string {
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
   * @param name Name of the schema.
   * @param struct Structure of the schema.
   */
  public static fromSchemaDefinition<T extends Record<string, unknown>>(
    name: string,
    struct: SchemaDefinition<T>
  ): Model<T> {
    const newSchema = new Schema<T>(name, struct);
    const newModel = new Model(newSchema);
    return newModel;
  }

  /**
   * Extract the root model id from the ArrayBuffer.
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
      this.appendToDataView(uint(8), Model.BUFFER_ARRAY);
      this.appendToDataView(string(8), this._schema.id);
      for (let i = 0; i < objectOrArray.length; i++) {
        this.serialize(objectOrArray[i], this._schema.struct);
      }
    }
    // Object
    else {
      this.appendToDataView(uint(8), Model.BUFFER_OBJECT);
      this.appendToDataView(string(8), this._schema.id);
      this.serialize(objectOrArray, this._schema.struct);
    }

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
    const header = dataView.getUint8(0);
    if (expect && expect !== header) {
      throw new Error(`Expected ArrayBuffer structure ${expect} but got ${header}.`);
    }

    // Ensure the root model id matches this model
    let rootId = '';
    for (let i = 1; i < 6; i++) {
      rootId += String.fromCharCode(dataView.getUint8(i));
    }
    if (rootId !== this._schema.id) {
      throw new Error(
        `ArrayBuffer id does not match the id of this model's schema. Expected: ${this._schema.id}, got: ${rootId}`
      );
    }

    // Handle object
    if (header === Model.BUFFER_OBJECT) {
      for (const key in this._schema.struct) {
        const structValue = this._schema.struct[key];
        if (isBufferView(structValue)) {
        } else {
          structValue;
        }
      }
    }
    // Handle array
    else {
      //
    }

    // Find the schema id indexes in the buffer
    let index = 0;
    const idIndexes: number[] = [];

    while (index > -1) {
      index = int8Array.indexOf(35, index); // charCode for '#' is 35
      if (index !== -1) {
        idIndexes.push(index);
        index++;
      }
    }

    // Read the buffer at the indexes to get the schema ids
    const schemaIds = idIndexes.map((index) => {
      let id = '';
      for (let i = 0; i < 5; i++) {
        const char = String.fromCharCode(int8Array[index + i]);
        id += char;
      }
      return id;
    });

    // Assemble schema information
    const schemas: Schema[] = [];
    for (let i = 0; i < schemaIds.length; i++) {
      // Ensure that the Schema with the specified id exists in our instance map
      const schema = Schema.getInstanceById(schemaIds[i]);
      if (schema) {
        schema.startsAt = idIndexes[i] + 5;
        schemas.push(schema);
      }
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

    console.log('data:', data);
    console.log('data per schema:', dataPerSchema);
    return data;
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
        this.appendToDataView(schemaProp, dataProp);
      }
      // Schema
      else if (schemaProp instanceof Schema && isObject(dataProp)) {
        this.appendToDataView(string(8), schemaProp.id);
        this.serialize(dataProp, schemaProp.struct);
      }
      // Object
      else if (isObject(schemaProp) && isObject(dataProp)) {
        this.appendToDataView(string(8), '#$obj');
        this.serialize(dataProp, schemaProp);
      }
      // Array
      else if (Array.isArray(schemaProp) && Array.isArray(dataProp)) {
        const firstIndex = schemaProp[0];
        // Schema
        if (firstIndex instanceof Schema) {
          this.appendToDataView(string(8), firstIndex.id);
          for (const dataValue of dataProp) {
            this.serialize(dataValue, firstIndex.struct);
          }
        }
        // BufferView
        else {
          for (const dataValue of dataProp) {
            this.appendToDataView(firstIndex, dataValue);
          }
        }
      } else {
        throw new Error('Bad object does not conform to schema');
      }
    }
  }

  /**
   * Append data depending on the BufferView, while incrementing the byte position.
   * @param bufferView
   * @param data Data to be appended.
   */
  protected appendToDataView(bufferView: BufferView<string | number>, data: string | number): void {
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
