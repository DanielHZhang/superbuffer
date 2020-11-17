import type {BufferView, BufferViewFunction, TypedArrayView} from './types';

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays

type DigitOption = {
  /** Number of digits to truncate the number and decimal to. */
  digits?: number;
};
type SignedOption = {
  /** Denotes whether the integer is signed or unsigned. */
  signed: boolean;
};
type IntOptions = SignedOption & DigitOption;
type StringOptions = {
  /** Number of characters to truncate the string to. */
  length: number;
};

/**
 * Creates a schema representation for an integer value.\
 * Types of integers:\
 * `int8`: [-128, 127] (1 byte)\
 * `uint8`: [0, 255] (1 byte)\
 * `int16`: [-32768, 32767] (2 bytes)\
 * `uint16`: [0, 65535] (2 bytes)\
 * `int32`: [-2147483648, 2147483647] (4 bytes)\
 * `uint32`: [0, 4294967295] (4 bytes)
 * @param type Number of bits assigned for the integer.
 * @param options Control whether the int is signed and truncated.
 */
export const int = (type: 8 | 16 | 32, options: IntOptions): BufferView<number> => ({
  type: `${options.signed ? 'Int' : 'Uint'}${type}`,
  bytes: type === 8 ? 1 : type === 16 ? 2 : type === 32 ? 4 : 8,
  digits: options.digits,
});

/**
 * Creates a schema representation for a BigInteger value.\
 * Types of BigIntegers:\
 * `int64`: [-2^63, 2^63-1] (8 bytes)\
 * `uint64`: [0, 2^64-1] (8 bytes)
 * @param options Control whether the bigint is signed and truncated.
 */
export const bigint = (options: IntOptions): BufferView<bigint> => ({
  type: `Big${options.signed ? 'Int' : 'Uint'}64`,
  bytes: 8,
  digits: options.digits,
});

/**
 * Creates a schema representation for a floating-point value.\
 * Types of floats:\
 * `float32`: [1.2×10-38, 3.4×1038] (7 significant digits) (4 bytes)\
 * `float64`: [5.0×10-324, 1.8×10308] (16 significant digits) (8 bytes)
 * @param options Control whether the float is truncated.
 */
export const float = (type: 32 | 64, options: IntOptions): BufferView<number> => ({
  type: `Float${type}`,
  bytes: type === 32 ? 4 : 8,
  digits: options.digits,
});

/**
 * Creates a schema representation for a string value.\
 * Types of strings:\
 * `string8`: UTF-8 (1 byte per char)\
 * `string16`: UTF-16 (2 bytes per char)
 * @param options Control whether the string is truncated.
 */
export const string = (type: 8 | 16, options: StringOptions): BufferView<string> => ({
  type: `String${type}`,
  bytes: type === 8 ? 1 : 2,
  length: options.length,
});

// /** -128 to 127 (1 byte) */
// export const int8: TypedArrayView = {_type: 'Int8Array', _bytes: 1};
// /** 0 to 255 (1 byte) */
// export const uint8: TypedArrayView = {_type: 'Uint8Array', _bytes: 1};

// /** -32768 to 32767 (2 bytes) */
// export const int16: TypedArrayView = {_type: 'Int16Array', _bytes: 2};
// /** 0 to 65535 (2 bytes) */
// export const uint16: TypedArrayView = {_type: 'Uint16Array', _bytes: 2};

// /** -2147483648 to 2147483647 (4 bytes) */
// export const int32: TypedArrayView = {_type: 'Int32Array', _bytes: 4};
// /** 0 to 4294967295 (4 bytes) */
// export const uint32: TypedArrayView = {_type: 'Uint32Array', _bytes: 4};

// /** -2^63 to 2^63-1 (8 bytes) */
// export const int64: TypedArrayView = {_type: 'BigInt64Array', _bytes: 8};
// /** 0 to 2^64-1 (8 bytes) */
// export const uint64: TypedArrayView = {_type: 'BigUint64Array', _bytes: 8};

// /** 1.2×10-38 to 3.4×1038 (7 significant digits e.g., 1.123456) (4 bytes) */
// export const float32: TypedArrayView = {_type: 'Float32Array', _bytes: 4};

// /** 5.0×10-324 to 1.8×10308 (16 significant digits e.g., 1.123...15) (8 bytes) */
// export const float64: TypedArrayView = {_type: 'Float64Array', _bytes: 8};

// /** 1 byte per character */
// export const string8: TypedArrayView = {_type: 'String8', _bytes: 1};
// /** 2 bytes per character */
// export const string16: TypedArrayView = {_type: 'String16', _bytes: 2};
