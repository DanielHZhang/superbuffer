import type {Model} from './model';
import type {Schema} from './schema';

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

/**
 * Defines a TypedArray within an ArrayBuffer.
 */
export type BufferView<T extends string | number = string | number> = {
  type: string;
  bytes: number;
  digits?: number;
  length?: number;
};

/**
 * A BufferView, BufferView array, Schema, or Schema array.
 */
export type BufferViewOrSchema = BufferView | [BufferView] | Schema | [Schema];

/**
 * Defines a BufferSchema.
 */
export type SchemaDefinition<T> = {
  [K in keyof T]: T[K] extends BufferViewOrSchema
    ? T[K]
    : T[K] extends Record<string, unknown>
    ? SchemaDefinition<T[K]>
    : never;
};

/**
 * Extracts the plain object representation of the schema definition.
 */
export type SchemaObject<T> = {
  [K in keyof T]: T[K] extends BufferView<infer U>
    ? U
    : T[K] extends BufferView<infer U>[]
    ? U[]
    : T[K] extends Schema<infer U>
    ? SchemaObject<U>
    : T[K] extends Schema<infer U>[]
    ? SchemaObject<U>[]
    : T[K] extends Record<string, unknown>
    ? SchemaObject<T[K]>
    : never;
};

/**
 * Extract the SchemaDefinition type from a Model.
 */
export type ExtractModelDefinition<T> = T extends Model<infer U> ? SchemaDefinition<U> : never;

/**
 * Extract the SchemaObject type from a Model.
 */
export type ExtractModelObject<T> = T extends Model<infer U> ? SchemaObject<U> : never;

/**
 * Byteref
 */
export type ByteRef = {position: number};

// function what<T>(obj: SchemaDefinition<T>): ExtractObject<T> {
//   return;
// }
// const same = what({
//   a: uint(8),
//   b: [uint(8)],
//   c: {one: uint(8), two: string(16)},
//   d: new Schema('same', {x: uint(8)}),
//   e: [new Schema('wow', {one: uint(8)})],
// });
// same.c.one;
// same.c.two;
// same.d.x;
// same.e[0].one;
// [K in keyof T]: SchemaDefinition<T[K]> | BufferViewOrSchema;
// [K in keyof T]: T[K] extends ObjectValidator<infer O>
//   ? SchemaDefinition<O>
//   : T[K] extends NativeTypeValidator<infer O>
//   ? O
//   : T[K] extends object
//   ? SchemaDefinition<T[K]>
//   : T[K];
// [K in keyof T]: T[K] extends BufferViewOrSchema ? string : number;
// | (T[K] extends SchemaDefinition<infer O> ? SchemaDefinition<T[K]> : BufferViewOrSchema)
// | BufferViewOrSchema;

// type Samerino<T> = Pick<FullView, ''

// export type BufferViewFunction<T> = (type: number) => BufferView<T>;

// type Cool<T> = T extends SchemaDefinition<infer U> ? U : never;

// type R = ExtractWhat<typeof what>;

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
