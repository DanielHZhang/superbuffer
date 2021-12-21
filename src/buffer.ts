import type {BufferView, Serializable} from './types';
import {uint8} from './views';

/**
 * The BufferManager class provides an API for reading and writing to an ArrayBuffer via
 * DataViews while tracking the current byte offset and automatically handling string encoding.
 */
export class BufferManager {
  /**
   * Max buffer size for a serialized object. Default: 1 megabyte.
   */
  public readonly maxByteSize: number;
  /**
   * Internal ArrayBuffer reference.
   */
  protected _buffer: ArrayBuffer;
  /**
   * Internal DataView reference.
   */
  protected _dataView: DataView;
  /**
   * Current byte position in the DataView.
   */
  protected _offset: number;
  /**
   * Internal TextEncoder reference.
   */
  protected _textEncoder: TextEncoder;
  /**
   * Internal TextDecoder reference.
   */
  protected _textDecoder: TextDecoder;
  /**
   * Internal Uint8Array representation of the DataView.
   */
  protected _uint8Array: Uint8Array;
  /**
   * Get the current byte offset of the buffer.
   */
  public get offset(): number {
    return this._offset;
  }

  public get internal(): ArrayBuffer {
    return this._buffer;
  }

  /**
   * Create a new BufferManager instance.
   * @param bufferSize The maximum size of the internal ArrayBuffer.
   */
  public constructor(bufferSize?: number) {
    this.maxByteSize = bufferSize ?? 1e6;
    this._offset = 0;
    this._buffer = new ArrayBuffer(this.maxByteSize);
    this._dataView = new DataView(this._buffer);
    this._uint8Array = new Uint8Array(this._buffer);
    this._textEncoder = new TextEncoder();
    this._textDecoder = new TextDecoder();
  }

  /**
   * Refresh this Model's internal buffer and DataView before toBuffer is called.
   * @param newBuffer Specific ArrayBuffer instance, otherwise a default will be used.
   */
  public refresh(newBuffer?: ArrayBuffer): void {
    this._offset = 0;
    if (newBuffer) {
      this._uint8Array.set(new Uint8Array(newBuffer));
    }
  }

  /**
   * Append data to the internal DataView buffer.
   * @param bufferView BufferView to define the type appended.
   * @param data Data to be appended to the DataView.
   */
  public append(bufferView: BufferView, data: Serializable): void {
    const type = bufferView.type;
    if (type === 'String') {
      this._dataView.setUint8(this._offset, 34); // Wrap in double quotes
      this._offset += uint8.bytes;
      const encoded = this._textEncoder.encode(data.toString());
      this._uint8Array.set(encoded, this._offset);
      this._offset += encoded.byteLength;
      this._dataView.setUint8(this._offset, 34); // Wrap in double quotes
      this._offset += uint8.bytes;
      return;
    }
    if (type === 'Boolean') {
      this._dataView.setUint8(this._offset, data === true ? 1 : 0);
    } else {
      if (type === 'BigInt64' || type === 'BigUint64') {
        data = typeof data === 'bigint' ? data : BigInt(data);
      } else if (type === 'Float32' || type === 'Float64') {
        const precision = type === 'Float32' ? 7 : 16;
        data = Number(Number(data).toPrecision(precision));
      }
      this._dataView[`set${type}` as const](this._offset, data as never);
    }
    this._offset += bufferView.bytes;
  }

  /**
   * Read the DataView at the current byte offset according to the BufferView type, and
   * increment the offset if the read was successful.
   * @param bufferView BufferView to define the type read.
   */
  public read(bufferView: BufferView): Serializable;
  public read(bufferView: BufferView<string>): string;
  public read(bufferView: BufferView<number>): number;
  public read(bufferView: BufferView<bigint>): bigint;
  public read(bufferView: BufferView): Serializable {
    let result: Serializable;
    let newOffset = this._offset + bufferView.bytes;
    // String
    if (bufferView.type === 'String') {
      const startingDoubleQuote = this._uint8Array[this._offset]; // Char code of " is 34
      const endQuoteIndex = this._uint8Array.indexOf(34, this._offset + 1);
      if (startingDoubleQuote !== 34 || endQuoteIndex < this._offset) {
        throw new Error('Buffer contains invalid string.');
      }
      result = this._textDecoder.decode(this._uint8Array.subarray(this._offset + 1, endQuoteIndex));
      newOffset = endQuoteIndex + 1;
    }
    // Boolean
    else if (bufferView.type === 'Boolean') {
      result = Boolean(this._dataView.getUint8(this._offset));
    }
    // Number
    else {
      result = this._dataView[`get${bufferView.type}` as const](this._offset);
      if (bufferView.type === 'Float32' || bufferView.type === 'Float64') {
        result = Number(Number(result).toPrecision(bufferView.type === 'Float32' ? 7 : 16));
      }
    }
    this._offset = newOffset;
    return result;
  }
}
