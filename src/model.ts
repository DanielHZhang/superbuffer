import {Schema} from './schema';
import {flatten, isObject, isTypedArrayView, set} from './utils';
import type {ByteRef, SchemaDefinition, TypedArrayView} from './types';
import {string8} from './views';

export class Model<T> {
  protected _schema: Schema<T>;
  protected _buffer: ArrayBuffer;
  protected _dataView: DataView;
  protected _bytes: number;

  public constructor(schema: Schema<T>) {
    this._bytes = 0;
    this._buffer = new ArrayBuffer(this._bytes);
    this._dataView = new DataView(this._buffer);
    this._schema = schema;
  }

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

  // public flatten(schema: Schema<T>, data: any): {d: any; t: string}[] {
  //   const accumulator: any[] = [];
  //   flatten(schema, data, accumulator);
  //   return accumulator;
  // }

  public flatten(data: Record<string, any>, struct: Record<string, any>): any {
    // const flat: {data: any; type: string}[] = [];

    for (const key of Object.keys(struct)) {
      const dataProp = data[key];
      const structProp = struct[key];
      // ArrayView
      if (isTypedArrayView(structProp)) {
        this.assign(structProp, dataProp, this._dataView);
        // flat.push({data: data[key], type: structValue._type});
      }
      // Schema
      else if (structProp instanceof Schema) {
        this.assign(string8, structProp.id, this._dataView);
        this.flatten(dataProp, structProp.struct);
        // flat.push({data: structValue._id, type: 'String8'});
        // flat.push(...structValue.flatten(value));
      }
      // Object
      else if (isObject(structProp)) {
        this.assign(string8, '#$obj', this._dataView);
        this.flatten(dataProp, structProp);
        // flat.push({data: 'OBJECT', type: 'String8'});
        // flat.push(...this.flatten(value, structValue));
      }
      // Array
      else if (Array.isArray(structProp)) {
        const type = structProp[0]; // typedArrayView or schema
        if (isTypedArrayView(type)) {
          for (const v of dataProp) {
            this.assign(type, v, this._dataView);
            // flat.push({data: v, type: type._type});
          }
        } else if (type instanceof Schema) {
          // console.log('got type:', type, value, structValue);
          this.assign(string8, type.id, this._dataView);
          // flat.push({data: type._id, type: 'String8'});
          for (const v of dataProp) {
            this.flatten(v, type.struct);
            // flat.push(...type.flatten(v));
          }
        } else {
          throw new Error('Bad object does not conform to schema');
        }
      } else {
        throw new Error('Bad object does not conform to schema');
      }
    }
    // return flat;
  }

  private assign(arrayView: TypedArrayView, data: any, dataView: DataView) {
    switch (arrayView._type) {
      case 'String8': {
        for (let j = 0; j < data.length; j++) {
          dataView.setUint8(this._bytes, (data as string)[j].charCodeAt(0));
          this._bytes++;
        }
        break;
      }
      case 'String16': {
        for (let j = 0; j < data.length; j++) {
          dataView.setUint16(this._bytes, (data as string)[j].charCodeAt(0));
          this._bytes += 2;
        }
        break;
      }
      case 'Int8Array': {
        dataView.setInt8(this._bytes, data);
        this._bytes++;
        break;
      }
      case 'Uint8Array': {
        dataView.setUint8(this._bytes, data);
        this._bytes++;
        break;
      }
      case 'Int16Array': {
        dataView.setInt16(this._bytes, data);
        this._bytes += 2;
        break;
      }
      case 'Uint16Array': {
        dataView.setUint16(this._bytes, data);
        this._bytes += 2;
        break;
      }
      case 'Int32Array': {
        dataView.setInt32(this._bytes, data);
        this._bytes += 4;
        break;
      }
      case 'Uint32Array': {
        dataView.setUint32(this._bytes, data);
        this._bytes += 4;
        break;
      }
      case 'BigInt64Array': {
        dataView.setBigInt64(this._bytes, BigInt(data));
        this._bytes += 8;
        break;
      }
      case 'BigUint64Array': {
        dataView.setBigUint64(this._bytes, BigInt(data));
        this._bytes += 8;
        break;
      }
      case 'Float32Array': {
        dataView.setFloat32(this._bytes, data);
        this._bytes += 4;
        break;
      }
      case 'Float64Array': {
        dataView.setFloat64(this._bytes, data);
        this._bytes += 8;
        break;
      }
    }
  }

  public toBuffer(object: T): ArrayBuffer {
    this.refresh();
    this.flatten(object, this._schema.struct);

    // console.log('what has dataview become:', this._dataView);
    // console.log('what has bytes:', this._bytes);

    const newBuffer = new ArrayBuffer(this._bytes);
    const view = new DataView(newBuffer);
    for (let i = 0; i < this._bytes; i++) {
      view.setUint8(i, this._dataView.getUint8(i));
    }
    // console.log('new buffer', newBuffer);
    return newBuffer;
  }

  public fromBuffer(buffer: ArrayBuffer): T {
    const view = new DataView(buffer);
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

        const schemaData = schema.deserialize(view, bytesRef);

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
   * Refresh this Model's internal buffer and DataView before toBuffer is called.
   */
  protected refresh(): void {
    this._buffer = new ArrayBuffer(8 * 1024);
    this._dataView = new DataView(this._buffer);
    this._bytes = 0;
  }
}
