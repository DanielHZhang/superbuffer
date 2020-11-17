import type {Model} from './model';
import type {Schema} from './schema';

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

type BaseView = {type: string; bytes: number};

/**
 * Defines a TypedArray within an ArrayBuffer.
 */
export type BufferView<T> = BaseView &
  (T extends number | bigint ? {digits?: number} : {length?: number});

// TODO: support [TypedArrayView]

/**
 * A TypedArray, TypedArrayDefinition, or Schema.
 */
export type TypedArrayOrSchema = BufferView | [BufferView] | Schema | [Schema];

/**
 * Defines a BufferSchema.
 */
export type SchemaDefinition<T extends Record<string, any>> = {
  [K in keyof T]: SchemaDefinition<T[K]> | TypedArrayOrSchema;
};

/**
 * Extract a Schema type from a Model type.
 */
export type ExtractModel<P> = P extends Model<infer U> ? U : never;

/**
 * Byteref
 */
export type ByteRef = {position: number};

// //////////////////////////////////////////////////

// class Same<T> {
//   public constructor(private val: T) {}
//   public wow = (): number => 2;
// }

function uint<T>(): BufferView<number> {
  return {_type: 'Uint8', _bytes: 2};
}

const int: BufferViewFunction<number> = (type) => ({_type: 'Int', _bytes: 2});

// type Samerino<T> = Pick<FullView, ''

export type BufferViewFunction<T> = (type: number) => BufferView<T>;

// type Extracterino<T> = T extends BufferViewFunction<infer U> ? U : never;
// type D = Extracterino<typeof int>;

const what = {
  a: int(8),
  b: int(16),
};

type ExtractWhat<T> = T extends {[K in keyof T]: infer O}
  ? O extends BufferView<infer U> | BufferView<infer U>[]
    ? U
    : O extends Schema<infer U> | Schema<infer U>[]
    ? U
    : never
  : never;
type R = ExtractWhat<typeof what>;

// type ExtractFunc<T> = T extends (...args: any[]) => infer U
//   ? U extends BufferView<infer V>
//     ? V
//     : never
//   : never;
// type E = ExtractFunc<typeof uint>;

// type Extract<T> = T extends Same<infer U> ? U : never;
// const sameInstance = new Same({a: 2, b: 'string', c: [2], d: new Same('a'), e: [new Same(2)]});
// type ExtractExample = ExtractModel<typeof sameInstance>;

// type ExtractSameExample = ExtractSame<ExtractExample>;

// type Foo<T, K extends keyof T = keyof T> = T extends {[key in K]: infer O} ? O : never;
// // type Ten<T, K extends keyof T> = {
// //   [key in K]: T[K];
// //   // [K in keyof T]: T extends
// // }
// type T10 = Foo<{a: string; b: string}>; // string
// type T11 = Foo<{a: string; b: number}>; // string | number

// function num(): number {
//   return 2;
// }

// function str(): string {
//   return '';
// }

// type What<T> = {
//   [K in keyof T]: What<T[K]> | Foo<T>;
// };

// function whatify<T extends Record<string, any>, K extends keyof T>(obj: T): What<T> {
//   return obj;
// }

// const result = whatify({a: num(), b: str()});
// result.a; // should be number
// result.b; // should be string

// const wow: What = {
//   a: num(),
//   b: str(),
// };
