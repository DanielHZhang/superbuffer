import type {BufferView, Serializable, ViewNumber, ViewString, ViewBigInt} from './types';
import {int16} from './views';

/**
 * Identifier for the start position of serialized plain objects.
 */
const OBJECT_HEADER = 61312;

/**
 * Identifier for the start position of serialized arrays.
 */
const ARRAY_HEADER = 48364;

/**
 * Identifier for the start position of serialized schema objects.
 */
const SCHEMA_HEADER = 46670;

/**
 * Identifier for the start position of a serialized string.
 */
const STRING_START = -21748;

/**
 * Identifier for the end posiition of a serialized string.
 */
const STRING_END = -26353;

export class BufferManager {
  /**
   * Max buffer size for a serialized object. Default: 512 kibibytes.
   */
  protected readonly _maxBufferSize;

  /**
   * Current byte position in the DataView.
   */
  protected _bytePos: number;

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

  public constructor(bufferSize?: number) {
    this._bytePos = 0;
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
  public refresh(): void {
    if (this._bytePos > 0) {
      this._bytePos = 0;
      this._buffer = new ArrayBuffer(this._maxBufferSize);
      this._dataView = new DataView(this._buffer);
    }
  }

  /**
   * Append data to this model's DataView buffer.
   * @param bufferView BufferView to define the type appended.
   * @param data Data to be appended to the DataView.
   */
  public append(bufferView: BufferView, data: Serializable): void {
    switch (bufferView.type) {
      case 'String8': {
        this._dataView.setInt16(this._bytePos, STRING_START);
        this._bytePos += int16.bytes;
        const encoded = this._textEncoder.encode(data.toString());
        this._uint8Array.set(encoded, this._bytePos);
        this._bytePos += encoded.byteLength;
        this._dataView.setInt16(this._bytePos, STRING_END);
        this._bytePos += int16.bytes;
        return;
      }
      case 'BigInt64':
      case 'BigUint64': {
        this._dataView[`set${bufferView.type}` as const](
          this._bytePos,
          typeof data === 'bigint' ? data : BigInt(data)
        );
        this._bytePos += bufferView.bytes;
        return;
      }
      default: {
        this._dataView[`set${bufferView.type}` as const](this._bytePos, Number(data));
        this._bytePos += bufferView.bytes;
        return;
      }
    }
  }

  public readString(
    bufferView: BufferView<string>,
    position: number
  ): {data: string; position: number} {
    const getter = `get${bufferView.type === 'String8' ? 'Uint8' : 'Uint16'}` as const;
    let data = '';
    let num;
    while (position < this._dataView.byteLength) {
      num = this._dataView[getter](position);
      position += bufferView.bytes;
      if (num === STRING_END) {
        break;
      }
      data += String.fromCharCode(num);
    }
    return {data, position};
  }

  /**
   * Read the DataView at the specified position according to the BufferView type.
   * @param bufferView BufferView to define the type read.
   * @param position Position in the DataView where to read.
   */
  public readNumber(bufferView: BufferView<number | bigint>, position: number): Serializable {
    return this._dataView[`get${bufferView.type}` as const](position);
  }

  protected isHeader(current: any): boolean {
    return (
      typeof current === 'number' &&
      (current === ARRAY_HEADER || current === OBJECT_HEADER || current === SCHEMA_HEADER)
    );
  }
}
