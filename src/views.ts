import type {BufferView} from './types';

// See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays

type DigitOption = {
  /** Number of digits to truncate the number and decimal to. */
  digits?: number;
};
type SignedOption = {
  /** Denotes whether the integer is signed or unsigned. */
  signed: boolean;
};
type StringOptions = {
  /** Number of characters to truncate the string to. */
  length: number;
};

/**
 * Creates a schema representation for a signed integer value.\
 * Types of integers:\
 * `int8`: [-128, 127] (1 byte)\
 * `int16`: [-32768, 32767] (2 bytes)\
 * `int32`: [-2147483648, 2147483647] (4 bytes)\
 * @param type Bit length of the integer.
 * @param options Control whether the int is signed and truncated.
 * @default options.signed false
 */
export const int = (type: 8 | 16 | 32, options?: DigitOption): BufferView<number> => ({
  type: `Int${type}` as const,
  bytes: type === 8 ? 1 : type === 16 ? 2 : 4,
  digits: options?.digits,
});

/**
 * Creates a schema representation for an unsigned integer value.\
 * Types of integers:\
 * `uint8`: [0, 255] (1 byte)\
 * `uint16`: [0, 65535] (2 bytes)\
 * `uint32`: [0, 4294967295] (4 bytes)
 * @param type Bit length of the integer.
 * @param options Control whether the int is signed and truncated.
 */
export const uint = (type: 8 | 16 | 32, options?: DigitOption): BufferView<number> => ({
  type: `Uint${type}` as const,
  bytes: type === 8 ? 1 : type === 16 ? 2 : 4,
  digits: options?.digits,
});

/**
 * Creates a schema representation for a BigInteger value.\
 * Types of BigIntegers:\
 * `int64`: [-2^63, 2^63-1] (8 bytes)\
 * `uint64`: [0, 2^64-1] (8 bytes)
 * @param options Control whether the bigint is signed and truncated.
 */
export const bigint = (options: DigitOption & SignedOption): BufferView<bigint> => ({
  type: `Big${options.signed ? 'Int' : 'Uint'}64` as const,
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
export const float = (type: 32 | 64, options?: DigitOption): BufferView<number> => ({
  type: `Float${type}` as const,
  bytes: type === 32 ? 4 : 8,
  digits: options?.digits,
});

/**
 * Creates a schema representation for a string value.\
 * Types of strings:\
 * `string8`: UTF-8 (1 byte per char)\
 * `string16`: UTF-16 (2 bytes per char)
 * @param options Control whether the string is truncated.
 */
export const string = (type: 8 | 16, options?: StringOptions): BufferView<string> => ({
  type: `String${type}` as const,
  bytes: type === 8 ? 1 : 2,
  length: options?.length,
});
