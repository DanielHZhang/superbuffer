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
