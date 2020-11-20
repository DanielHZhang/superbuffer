export class BufferManager {
  protected _dataView: DataView;

  public constructor(dataView: DataView) {
    this._dataView = dataView;
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
  }

  protected readString(
    dataView: DataView,
    bufferView: BufferView<string>,
    position: number
  ): {data: string; position: number} {
    const getter = `get${bufferView.type === 'String8' ? 'Uint8' : 'Uint16'}` as const;
    let data = '';
    let num;
    while (position < dataView.byteLength) {
      num = dataView[getter](position);
      position += bufferView.bytes;
      if (num === Model.STRING_END) {
        break;
      }
      data += String.fromCharCode(num);
    }
    return {data, position};
  }
}
