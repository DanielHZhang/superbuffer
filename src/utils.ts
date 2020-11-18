import {Schema} from './schema';
import {BufferView} from './types';

export function isObject<T extends Record<any, any>>(obj: any): obj is T {
  return typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype;
}

export function isStringOrNumber(value: any): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

export function isBufferView(value: any): value is BufferView {
  return value && typeof value.type === 'string' && typeof value.bytes === 'number';
}

/**
 * Convert a string to a hash.
 * See: https://stackoverflow.com/a/7616484/12656855
 * @param s
 */
export function stringToHash(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  hash *= 254785; // times a random number
  return Math.abs(hash).toString(32).slice(2, 6);
}

/**
 * Add empty spaces to the end of the string
 * @param str
 * @param length
 */
export function cropString(str: string, length: number): string {
  return str.padEnd(length, ' ').slice(0, length);
}

type Flat = {d: string | number; t: string};

/**
 * See: https://stackoverflow.com/a/15589677/12656855
 * @param schema
 * @param data
 * @param accumulator
 */
export function flatten<T>(schema: Schema<T>, data: T, accumulator: Flat[]): void {
  // add the schema id to flat[] (its a String8 with 5 characters, the first char is #)
  if (schema.id) {
    accumulator.push({d: schema.id, t: 'String8'});
  } else if (schema?.[0]?._id) {
    accumulator.push({d: schema[0]._id, t: 'String8'});
  }

  // if it is a schema
  if (schema.struct) {
    schema = schema.struct;
  }
  // if it is a [schema]
  else if (schema?.[0]?.struct) {
    schema = schema[0].struct;
  }

  // console.log('-------')
  // console.log('schema', typeof schema, schema)
  // console.log('data', typeof data, data)

  for (const key in data) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      continue;
    }
    if (typeof data[key] === 'object') {
      // if data is array, but schemas is flat, use index 0 on the next iteration
      if (Array.isArray(data)) {
        flatten(schema, data[parseInt(key, 10)], accumulator);
      } else {
        flatten(schema[key], data[key], accumulator);
      }
    } else {
      // handle special types e.g.:  "x: { type: int16, digits: 2 }"
      if (schema[key]?.type?._type) {
        if (schema[key]?.digits) {
          data[key] *= Math.pow(10, schema[key].digits);
          data[key] = parseInt(data[key].toFixed(0), 10);
        }
        if (schema[key]?.length) {
          const length = schema[key]?.length;
          data[key] = cropString(data[key], length);
        }
        accumulator.push({d: data[key], t: schema[key].type._type});
      } else {
        // crop strings to default length of 12 characters if nothing else is specified
        if (schema[key]._type === 'String8' || schema[key]._type === 'String16') {
          data[key] = cropString(data[key], 12);
        }
        accumulator.push({d: data[key], t: schema[key]._type});
      }
    }
  }
}
