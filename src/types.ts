import type {Model} from './model';
import type {Schema} from './schema';

/* eslint-disable @typescript-eslint/consistent-indexed-object-style */

export type ViewType =
  | 'Uint8'
  | 'Uint16'
  | 'Uint32'
  | 'Int8'
  | 'Int16'
  | 'Int32'
  | 'BigInt64'
  | 'BigUint64'
  | 'Float32'
  | 'Float64'
  | 'String8'
  | 'String16';

/**
 * Defines a TypedArray within an ArrayBuffer.
 */
export type BufferView<T extends string | number | bigint = string | number | bigint> = {
  type: ViewType;
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
