import {Schema} from './schema';
import {isObject, isStringOrNumber, isTypedArrayView} from './utils';
import {string8, uint8} from './views';
import type {SchemaDefinition, TypedArrayView} from './types';

export class Model<T extends Record<string, any>> {
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
  public static fromSchemaDefinition<T extends Record<string, any>>(
    name: string,
    struct: SchemaDefinition<T>
  ): Model<T> {
    const newSchema = new Schema(name, struct);
    const newModel = new Model<T>(newSchema);
    return newModel;
  }

  /**
   * Get a model's ID from an ArrayBuffer.
   * @param buffer
   */
  public static getIdFromBuffer(buffer: ArrayBuffer): string {
    const dataView = new DataView(buffer);
    let id = '';
    for (let i = 0; i < 5; i++) {
      const uInt8 = dataView.getUint8(i);
      id += String.fromCharCode(uInt8);
    }
    return id;
  }

  /**
   * Serialize an object or an array of objects defined by this Model's schema into an ArrayBuffer.
   * @param objectOrArray The object or array of objects to be serialized.
   */
  public toBuffer(objectOrArray: T | T[]): ArrayBuffer {
    this.refresh();

    // Array
    if (Array.isArray(objectOrArray)) {
      this.appendToDataView(uint8, Model.BUFFER_ARRAY);
      this.appendToDataView(string8, this._schema.id);
      for (let i = 0; i < objectOrArray.length; i++) {
        this.serialize(objectOrArray[i], this._schema.struct);
      }
    }
    // Object
    else {
      this.appendToDataView(uint8, Model.BUFFER_OBJECT);
      this.appendToDataView(string8, this._schema.id);
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
  public fromBuffer(buffer: ArrayBuffer, expect?: number): T | T[] {
    const dataView = new DataView(buffer);
    const int8 = new Int8Array(buffer);

    // Find the schema id indexes in the buffer
    let index = 0;
    const idIndexes: number[] = [];

    while (index > -1) {
      index = int8.indexOf(35, index); // charCode for '#' is 35
      if (index !== -1) {
        idIndexes.push(index);
        index++;
      }
    }

    // Read the buffer at the indexes to get the schema ids
    const schemaIds = idIndexes.map((index) => {
      let id = '';
      for (let i = 0; i < 5; i++) {
        const char = String.fromCharCode(int8[index + i]);
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

    let data: any = {}; // holds all the data we want to give back
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
    return;

    // add dataPerScheme to data
    data = {};

    for (let i = 0; i < Object.keys(dataPerSchema).length; i++) {
      const key = Object.keys(dataPerSchema)[i];
      const value = dataPerSchema[key];
      this.populateData(this._schema, key, value, '');
    }

    return data;
  }

  /**
   * Serialize data that adheres to the provided object structure.
   * @param data Data to be serialized.
   * @param struct SchemaDefinition structure.
   */
  protected serialize(
    data: Record<string, number | string | Record<string, any>>,
    struct: Record<string, string | number | Record<string, any>>
  ): void {
    for (const key of Object.keys(struct)) {
      const dataProp = data[key]; // Actual data values
      const schemaProp = struct[key]; // Corresponds with values from schema
      // ArrayView
      if (isTypedArrayView(schemaProp) && isStringOrNumber(dataProp)) {
        this.appendToDataView(schemaProp, dataProp);
      }
      // Schema
      else if (schemaProp instanceof Schema && isObject(dataProp)) {
        this.appendToDataView(string8, schemaProp.id);
        this.serialize(dataProp, schemaProp.struct);
      }
      // Object
      else if (isObject(schemaProp) && isObject(dataProp)) {
        this.appendToDataView(string8, '#$obj');
        this.serialize(dataProp, schemaProp);
      }
      // Array
      else if (Array.isArray(schemaProp) && Array.isArray(dataProp)) {
        const firstIndex = schemaProp[0];
        // Schema
        if (firstIndex instanceof Schema) {
          this.appendToDataView(string8, firstIndex.id);
          for (const dataValue of dataProp) {
            this.serialize(dataValue, firstIndex.struct);
          }
        }
        // TypedArrayView
        else {
          for (const dataValue of dataProp) {
            this.appendToDataView(firstIndex as TypedArrayView, dataValue);
          }
        }
      } else {
        throw new Error('Bad object does not conform to schema');
      }
    }
  }

  /**
   * Append data depending on the TypedArrayView, while incrementing the byte position.
   * @param arrayView
   * @param data Data to be appended.
   */
  protected appendToDataView(arrayView: TypedArrayView, data: string | number): void {
    if (typeof data === 'string') {
      // Crop strings to default length of 12 characters
      // const cropped = cropString(data, 12);
      for (let i = 0; i < data.length; i++) {
        // String8
        if (arrayView._type === 'String8') {
          this._dataView.setUint8(this._bytes, data.charCodeAt(i));
        }
        // String16
        else {
          this._dataView.setUint16(this._bytes, data.charCodeAt(i));
        }
        this._bytes += arrayView._bytes;
      }
    } else {
      switch (arrayView._type) {
        case 'Int8Array': {
          this._dataView.setInt8(this._bytes, data);
          break;
        }
        case 'Uint8Array': {
          this._dataView.setUint8(this._bytes, data);
          break;
        }
        case 'Int16Array': {
          this._dataView.setInt16(this._bytes, data);
          break;
        }
        case 'Uint16Array': {
          this._dataView.setUint16(this._bytes, data);
          break;
        }
        case 'Int32Array': {
          this._dataView.setInt32(this._bytes, data);
          break;
        }
        case 'Uint32Array': {
          this._dataView.setUint32(this._bytes, data);
          break;
        }
        case 'BigInt64Array': {
          this._dataView.setBigInt64(this._bytes, BigInt(data));
          break;
        }
        case 'BigUint64Array': {
          this._dataView.setBigUint64(this._bytes, BigInt(data));
          break;
        }
        case 'Float32Array': {
          this._dataView.setFloat32(this._bytes, data);
          break;
        }
        case 'Float64Array': {
          this._dataView.setFloat64(this._bytes, data);
          break;
        }
      }
      this._bytes += arrayView._bytes; // Increment the bytes
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
