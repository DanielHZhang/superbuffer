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
