import {Schema} from './schema';
import {flatten, set} from './utils';
import type {SchemaDefinition} from './types';

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

  public flatten(schema: Schema<T>, data: any): {d: any; t: string}[] {
    const accumulator: any[] = [];
    flatten(schema, data, accumulator);
    return accumulator;
  }

  public toBuffer(worldState: T): ArrayBuffer {
    this.refresh();

    // deep clone the worldState
    const data = JSON.parse(JSON.stringify(worldState));
    const flat = this.flatten(this._schema, data);
    console.log('flattened:', flat);

    for (let i = 0; i < flat.length; i++) {
      const item = flat[i];
      switch (item.t) {
        case 'String8': {
          for (let j = 0; j < item.d.length; j++) {
            this._dataView.setUint8(this._bytes, (item.d as string)[j].charCodeAt(0));
            this._bytes++;
          }
          continue;
        }
        case 'String16': {
          for (let j = 0; j < item.d.length; j++) {
            this._dataView.setUint16(this._bytes, (item.d as string)[j].charCodeAt(0));
            this._bytes += 2;
          }
          continue;
        }
        case 'Int8Array': {
          this._dataView.setInt8(this._bytes, item.d);
          this._bytes++;
          continue;
        }
        case 'Uint8Array': {
          this._dataView.setUint8(this._bytes, item.d);
          this._bytes++;
          continue;
        }
        case 'Int16Array': {
          this._dataView.setInt16(this._bytes, item.d);
          this._bytes += 2;
          continue;
        }
        case 'Uint16Array': {
          this._dataView.setUint16(this._bytes, item.d);
          this._bytes += 2;
          continue;
        }
        case 'Int32Array': {
          this._dataView.setInt32(this._bytes, item.d);
          this._bytes += 4;
          continue;
        }
        case 'Uint32Array': {
          this._dataView.setUint32(this._bytes, item.d);
          this._bytes += 4;
          continue;
        }
        case 'BigInt64Array': {
          this._dataView.setBigInt64(this._bytes, BigInt(item.d));
          this._bytes += 8;
          continue;
        }
        case 'BigUint64Array': {
          this._dataView.setBigUint64(this._bytes, BigInt(item.d));
          this._bytes += 8;
          continue;
        }
        case 'Float32Array': {
          this._dataView.setFloat32(this._bytes, item.d);
          this._bytes += 4;
          continue;
        }
        case 'Float64Array': {
          this._dataView.setFloat64(this._bytes, item.d);
          this._bytes += 8;
        }
      }
    }

    const newBuffer = new ArrayBuffer(this._bytes);
    const view = new DataView(newBuffer);

    // copy all data to a new resized ArrayBuffer
    for (let i = 0; i < this._bytes; i++) {
      view.setUint8(i, this._dataView.getUint8(i));
    }

    return newBuffer;
  }

  private populateData = (obj: any, key: any, value: any, path: string = '', isArray = false) => {
    if (obj?._id && obj._id === key) {
      const p = path.replace(/_struct\./, '').replace(/\.$/, '');
      // if it is a schema[], but only has one set, we manually have to make sure it transforms to an array
      if (isArray && !Array.isArray(value)) {
        value = [value];
      }
      // '' is the top level
      if (p === '') {
        data = {...data, ...value};
      } else {
        set(data, p, value);
      }
    } else {
      for (const props in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, props)) {
          if (typeof obj[props] === 'object') {
            const p = Array.isArray(obj) ? '' : `${props}.`;
            this.populateData(obj[props], key, value, path + p, Array.isArray(obj));
          }
          // obj
        }
      }
    }
  };

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
