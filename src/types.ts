import type {Model} from './model';
import type {Schema} from './schema';

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

/**
 * Defines a TypedArray.
 */
export type TypedArrayView = {
  _type: string;
  _bytes: number;
};

/**
 * Specify the TypedArray and the number of digits to truncate.
 */
export type TypedArrayDefinition = {
  type: TypedArrayView;
  digits?: number;
  length?: number;
};

// TODO: support [TypedArrayView]

/**
 * A TypedArray, TypedArrayDefinition, or Schema.
 */
export type TypedArrayOrSchema = TypedArrayView | TypedArrayDefinition | Schema | [Schema];

/**
 * Defines a BufferSchema.
 */
export type SchemaDefinition<T extends Record<string, any>> = {
  [K in keyof T]: SchemaDefinition<T[K]> | TypedArrayOrSchema;
};

/**
 * Extract a Schema type from a Model type.
 */
export type ExtractModel<P> = P extends Model<infer T> ? T : never;

export type ByteRef = {position: number};

// //////////////////////////////////////////////////

class Same<T> {
  public constructor(private val: T) {}
  public wow = (): number => 2;
}

type Extract<T> = T extends Same<infer U> ? U : never;
const sameInstance = new Same({a: 2, b: 'string', c: [2], d: new Same('a'), e: [new Same(2)]});
type ExtractExample = Extract<typeof sameInstance>;

type ExtractSame<T> = T extends {[K in keyof T]: infer O}
  ? O extends (Same<infer U> | Same<infer U>[])
    ? U
    : O
  : never;
type ExtractSameExample = ExtractSame<ExtractExample>;

type Foo<T, K extends keyof T = keyof T> = T extends {[key in K]: infer O} ? O : never;
// type Ten<T, K extends keyof T> = {
//   [key in K]: T[K];
//   // [K in keyof T]: T extends
// }
type T10 = Foo<{a: string; b: string}>; // string
type T11 = Foo<{a: string; b: number}>; // string | number

function num(): number {
  return 2;
}

function str(): string {
  return '';
}

type What<T> = {
  [K in keyof T]: What<T[K]> | Foo<T>;
};

function whatify<T extends Record<string, any>, K extends keyof T>(obj: T): What<T> {
  return obj;
}

const result = whatify({a: num(), b: str()});
result.a; // should be number
result.b; // should be string

const wow: What = {
  a: num(),
  b: str(),
};
