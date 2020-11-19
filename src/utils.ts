import type {BufferView} from './types';

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
 * Add empty spaces to the end of the string
 * @param str
 * @param length
 */
export function cropString(str: string, length: number): string {
  return str.padEnd(length, ' ').slice(0, length);
}
