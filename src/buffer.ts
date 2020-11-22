import {uint8} from './views';
import type {BufferView, Serializable} from './types';
import {truncateFloat} from './utils';

/**
 * The BufferManager class provides an API for reading and writing to an ArrayBuffer via
 * DataViews while tracking the current byte offset and automatically handling string encoding.
 */
export class BufferManager {
  /**
   * Max buffer size for a serialized object. Default: 1 megabyte.
   */
  protected readonly _maxBufferSize: number;
  /**
   * Internal ArrayBuffer reference.
   */
  public _buffer: ArrayBuffer;
  /**
   * Internal DataView reference.
   */
  public _dataView: DataView;
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

  /**
   * Create a new BufferManager instance.
   * @param bufferSize The maximum size of the internal ArrayBuffer.
   */
  public constructor(bufferSize?: number) {
    this._offset = 0;
    this._maxBufferSize = bufferSize ?? 1e6;
    this._buffer = new ArrayBuffer(this._maxBufferSize);
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
    if (newBuffer) {
      this._offset = 0;
      this._buffer = newBuffer;
      this._dataView = new DataView(this._buffer);
    } else {
      if (this._offset > 0) {
        this._offset = 0;
        this._buffer = new ArrayBuffer(this._maxBufferSize);
        this._dataView = new DataView(this._buffer);
      }
    }
  }

  /**
   * Copy the contents of the internal ArrayBuffer (which may contain trailing empty sections)
   * into a new ArrayBuffer with no empty bytes.
   */
  public finalize(): ArrayBuffer {
    return this._buffer.slice(0, this._offset);
  }

  /**
   * Append data to the internal DataView buffer.
   * @param bufferView BufferView to define the type appended.
   * @param data Data to be appended to the DataView.
   */
  public append(bufferView: BufferView, data: Serializable): void {
    switch (bufferView.type) {
      case 'String': {
        this._dataView.setUint8(this._offset, 34); // Wrap in double quotes
        this._offset += uint8.bytes;
        const encoded = this._textEncoder.encode(data.toString());
        this._uint8Array.set(encoded, this._offset);
        this._offset += encoded.byteLength;
        this._dataView.setUint8(this._offset, 34); // Wrap in double quotes
        this._offset += uint8.bytes;
        return;
      }
      case 'BigInt64':
      case 'BigUint64': {
        this._dataView[`set${bufferView.type}` as const](
          this._offset,
          typeof data === 'bigint' ? data : BigInt(data)
        );
        this._offset += bufferView.bytes;
        return;
      }
      default: {
        this._dataView[`set${bufferView.type}` as const](this._offset, Number(data));
        this._offset += bufferView.bytes;
        return;
      }
    }
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
    switch (bufferView.type) {
      case 'String': {
        const startingDoubleQuote = this._uint8Array[this._offset]; // Char code of " is 34
        const endQuoteIndex = this._uint8Array.indexOf(34, this._offset + 1);
        if (startingDoubleQuote !== 34 || endQuoteIndex < this._offset) {
          throw new Error('Buffer contains invalid string.');
        }
        const result = this._textDecoder.decode(
          this._uint8Array.subarray(this._offset + 1, endQuoteIndex)
        );
        this._offset = endQuoteIndex + 1;
        return result;
      }
      case 'Float32':
      case 'Float64': {
        const result = this._dataView[`get${bufferView.type}` as const](this._offset);
        this._offset += bufferView.bytes;
        // Float32 has 7 significant digits, Float64 has 16 significant digits
        return Number(result.toPrecision(bufferView.type === 'Float32' ? 7 : 16));
      }
      default: {
        const result = this._dataView[`get${bufferView.type}` as const](this._offset);
        this._offset += bufferView.bytes;
        return result;
      }
    }
  }
}
