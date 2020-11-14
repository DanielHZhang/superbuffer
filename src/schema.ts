import {ByteRef, SchemaDefinition, TypedArrayView} from './types';
import {isTypedArrayView, stringToHash} from './utils';

export class Schema<T = Record<string, any>> {
  private static _schemas: Map<string, Schema> = new Map();
  public startsAt?: number;
  private _bytes: number = 0;
  private _id: string;
  private _name: string;
  private _struct: SchemaDefinition<T>;

  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get struct(): SchemaDefinition<T> {
    return this._struct;
  }

  public get bytes(): number {
    return this._bytes;
  }

  public constructor(name: string, struct: SchemaDefinition<T>) {
    this._name = name;
    this._struct = struct;
    this._id = Schema.newHash(name, struct);
    // Schema.Validation(_struct);
    this.calcBytes();
    Schema._schemas.set(this._id, this);
  }

  public static getInstanceById(id: string): Schema | undefined {
    return this._schemas.get(id);
  }

  private static newHash<T>(name: string, struct: SchemaDefinition<T>) {
    const hash = stringToHash(JSON.stringify(struct) + name);
    if (hash.length !== 4) {
      throw new Error('Hash has not length of 4');
    }
    return `#${hash}`;
  }

  // in the outer schema, call this to reconstruct all the inner schemas
  public reconstruct(): any {
    // const reconstructed = {};
    // const remaining: any[] = [];
    // // const keys = Object.keys(this.struct);
    // remaining.push(...Object.values(this._struct));
    // for (const key in this._struct) {
    //   const current = this._struct[key];
    //   if (isTypedArrayView(current)) {
    //     reconstructed[key] =
    //   }
    // }
    // return reconstructed;
  }

  private deserializeObject(object: Record<string, any>, dataView: DataView, byteRef: ByteRef) {
    const assembled: Record<string, any> = {}; // TODO: see if there is a more specific type than this
    for (const key in object) {
      const value = object[key];

      // TypedArrayView (leaf)
      if (isTypedArrayView(value)) {
        assembled[key] = this.parseArrayView(value, dataView, byteRef);
      }
      // Schema
      else if (value instanceof Schema) {
        assembled[key] = value.deserialize(dataView, byteRef);

        const end = next?.startsAt ? next.startsAt - 5 : buffer.byteLength;

        console.log('what is the schema:', schema);

        // bytes is not accurate since it includes child schemas
        const length = schema.bytes || 1;

        // Determine the number of iterations for an array of items (e.g. 5 objects = 5 iterations)
        const iterations = Math.floor((end - schema.startsAt!) / length);
      }
      // Array
      else if (Array.isArray(value)) {
        // Struct should only contain single object or schema
        const def = value[0];

        const result = this.deserializeObject(value[0], dataView, byteRef);
        // for (let i = 0; i < value.length; i++) {
        //   // iterate through each array item recursively
        // }
      }
      // Object
      else if (typeof value === 'object' && Object.prototype === Object.getPrototypeOf(value)) {
        assembled[key] = this.deserializeObject(value, dataView, byteRef);
      }
      // Should be an error, we don't handle this type
      else {
        console.error('Unhandled type during deserialization:', value);
      }
    }
    return assembled;
  }

  public deserialize(dataView: DataView, byteRef: ByteRef): Record<string, any> {}

  private parseArrayView({_type, _bytes}: TypedArrayView, dataView: DataView, byteRef: ByteRef) {
    switch (_type) {
      case 'String8': {
        let value = '';
        for (let i = 0; i < 12; i++) {
          // POTENTIALLY CHANGE THIS TO A ARRAYBUFFER.SLICE
          const char = String.fromCharCode(dataView.getUint8(byteRef.position));
          value += char;
          byteRef.position++;
        }
        return value;
      }
      case 'String16': {
        let value = '';
        for (let i = 0; i < 12; i++) {
          const char = String.fromCharCode(dataView.getUint16(byteRef.position));
          value += char;
          byteRef.position += 2;
        }
        return value;
      }
      case 'Int8Array': {
        const value = dataView.getInt8(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'Uint8Array': {
        const value = dataView.getUint8(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'Int16Array': {
        const value = dataView.getInt16(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'Uint16Array': {
        const value = dataView.getUint16(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'Int32Array': {
        const value = dataView.getInt32(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'Uint32Array': {
        const value = dataView.getUint32(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'BigInt64Array': {
        const value = Number(dataView.getBigInt64(byteRef.position));
        byteRef.position += _bytes;
        return value;
      }
      case 'BigUint64Array': {
        const value = Number(dataView.getBigUint64(byteRef.position));
        byteRef.position += _bytes;
        return value;
      }
      case 'Float32Array': {
        const value = dataView.getFloat32(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
      case 'Float64Array': {
        const value = dataView.getFloat64(byteRef.position);
        byteRef.position += _bytes;
        return value;
      }
    }
  }

  // public deserialize(view: DataView, bytesRef: {bytes: number}): any {
  //   const data = {};
  //   const bytes = bytesRef.bytes;

  //   for (const key in this._struct) {
  //     if (!Object.prototype.hasOwnProperty.call(this._struct, key)) {
  //       continue;
  //     }
  //     const prop = this._struct[key];
  //     console.log('prop:', prop);

  //     // apply special types options
  //     if (digits) {
  //       value *= Math.pow(10, -specialTypes.digits);
  //       value = parseFloat(value.toFixed(specialTypes.digits));
  //     }

  //     // Handle specialTypes (e.g. x: {type: int16, digits: 2})
  //     // let specialTypes;
  //     // if (prop?.type?._type && prop?.type?._bytes) {
  //     //   specialTypes = prop;
  //     //   prop._type = prop.type._type;
  //     //   prop._bytes = prop.type._bytes;
  //     // }
  //   }

  //   bytesRef.bytes = bytes;

  //   return data;
  // }

  private calcBytes() {
    const iterate = (obj: Record<any, any>) => {
      for (const property in obj) {
        const type = obj?._type || obj?.type?._type;
        const bytes = obj._bytes || obj.type?._bytes;

        if (!type && Object.prototype.hasOwnProperty.call(obj, property)) {
          if (typeof obj[property] === 'object') {
            iterate(obj[property]);
          }
        } else {
          if (property !== '_type' && property !== 'type') {
            return;
          }
          if (!bytes) {
            return;
          }

          // we multiply the bytes by the String8 / String16 length.
          if (type === 'String8' || type === 'String16') {
            const length = obj.length || 12;
            this._bytes += bytes * length;
          } else {
            this._bytes += bytes;
          }
        }
      }
    };
    iterate(this._struct);
  }
}
