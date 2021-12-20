import type {BufferView, TypedArrayName} from './types';

/**
 * Test if an entity is an plain object.
 * @param value Value to be tested.
 */
export function isObject<T extends Record<any, any>>(value: any): value is T {
  return typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Test if an entity is an object that implements the BufferView interface.
 * @param value Value to be tested.
 */
export function isBufferView(value: any): value is BufferView {
  return value && typeof value.type === 'string' && typeof value.bytes === 'number';
}

/**
 * Get the TypedArray constructor based on it's name prefix.
 * @param value Name prefix.
 */
export function getTypedArrayByName(
  value: TypedArrayName
):
  | Uint8ArrayConstructor
  | Uint16ArrayConstructor
  | Uint32ArrayConstructor
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | BigInt64ArrayConstructor
  | BigUint64ArrayConstructor {
  switch (value) {
    case 'Uint8':
      return Uint8Array;
    case 'Uint16':
      return Uint16Array;
    case 'Uint32':
      return Uint32Array;
    case 'Int8':
      return Int8Array;
    case 'Int16':
      return Int16Array;
    case 'Int32':
      return Int32Array;
    case 'Float32':
      return Float32Array;
    case 'Float64':
      return Float64Array;
    case 'BigUint64':
      return BigUint64Array;
    case 'BigInt64':
      return BigInt64Array;
    default:
      throw new Error('Invalid buffer encoding type.');
  }
}
