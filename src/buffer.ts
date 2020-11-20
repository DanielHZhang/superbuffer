import {STRING_END, STRING_START} from './constants';
import type {BufferView, Serializable, ViewNumber, ViewString, ViewBigInt} from './types';
import {int16} from './views';

export class BufferManager {
  /**
   * Max buffer size for a serialized object. Default: 512 kibibytes.
   */
  protected readonly _maxBufferSize;

  /**
   * Current byte position in the DataView.
   */
  protected _offset: number;

  /**
   * Internal DataView reference.
   */
  protected _dataView: DataView;

  /**
   * Internal ArrayBuffer reference.
   */
  protected _buffer: ArrayBuffer;

  protected _uint8Array: Uint8Array;

  protected _textEncoder: TextEncoder;

  protected _textDecoder: TextDecoder;

  // public get bytes(): number {
  //   return this._bytePos;
  // }

  public constructor(bufferSize?: number) {
    this._offset = 0;
    this._maxBufferSize = bufferSize ?? 512 * 1024;
    this._buffer = new ArrayBuffer(this._maxBufferSize);
    this._dataView = new DataView(this._buffer);
    this._uint8Array = new Uint8Array(this._buffer);
    this._textEncoder = new TextEncoder();
    this._textDecoder = new TextDecoder();
  }

  /**
   * Refresh this Model's internal buffer and DataView before toBuffer is called.
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

  public finalize(): ArrayBuffer {
    return this._buffer.slice(0, this._offset);
    // Copy into new buffer
    // const newBuffer = new ArrayBuffer(this._bytePos);
    // const uint8Array = new Uint8Array(newBuffer).set()
    // const newDataView = new DataView(newBuffer);
    // for (let i = 0; i < this._bytePos; i++) {
    //   newDataView.setUint8(i, this._dataView.getUint8(i));
    // }
    // return newBuffer;
  }

  /**
   * Append data to the internal DataView buffer.
   * @param bufferView BufferView to define the type appended.
   * @param data Data to be appended to the DataView.
   */
  public append(bufferView: BufferView, data: Serializable): void {
    switch (bufferView.type) {
      case 'String8': {
        this._dataView.setInt16(this._offset, STRING_START);
        this._offset += int16.bytes;
        const encoded = this._textEncoder.encode(data.toString());
        this._uint8Array.set(encoded, this._offset);
        this._offset += encoded.byteLength;
        this._dataView.setInt16(this._offset, STRING_END);
        this._offset += int16.bytes;
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
   * @param offset Byte offset in the DataView to read. Defaults to the current byte offset.
   */
  public read(bufferView: BufferView<string>, offset?: number): string;
  public read(bufferView: BufferView<number>, offset?: number): number;
  public read(bufferView: BufferView<bigint>, offset?: number): bigint;
  public read(bufferView: BufferView, offset: number = this._offset): Serializable {
    switch (bufferView.type) {
      case 'String8': {
        const startingDoubleQuote = this._uint8Array[offset];
        const endQuoteIndex = this._uint8Array.indexOf(34, offset + 1); // Char code of " is 34
        if (startingDoubleQuote !== 34 || endQuoteIndex < offset) {
          throw new Error('Buffer contains invalid string.');
        }
        return this._textDecoder.decode(this._uint8Array.subarray(offset, endQuoteIndex - 1));
      }
      default: {
        return this._dataView[`get${bufferView.type}` as const](offset);
      }
    }
  }

  public walk() {}

  protected isHeader(current: any): boolean {
    return (
      typeof current === 'number' &&
      (current === ARRAY_HEADER || current === OBJECT_HEADER || current === SCHEMA_HEADER)
    );
  }
}
