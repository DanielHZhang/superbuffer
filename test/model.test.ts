import {int16, Model, Schema, string8, TypedArrayView, uint16, uint8} from '../src';

describe('Model class', () => {
  const deserializeString = (
    dataView: DataView,
    type: TypedArrayView,
    start: number,
    end: number
  ) => {
    let str = '';
    for (let i = 0; i < end - start; i++) {
      if (type._type === 'String8') {
        str += String.fromCharCode(dataView.getUint8(start + i));
      } else {
        str += String.fromCharCode(dataView.getUint16(start + i));
      }
    }
    return str;
  };

  it('Flattens the data object properly', () => {
    type Nested = {x: number; y: number};
    type State = {
      e: Nested[];
      b: string;
      g: number[];
      a: number;
      f: Nested;
      d: {
        one: number;
        two: number;
      };
    };

    const nested = new Schema<Nested>('nested', {y: uint8, x: uint8});
    const state = new Schema<State>('state', {
      e: [nested],
      b: string8,
      g: [uint16],
      a: uint8,
      f: nested,
      d: {
        two: int16,
        one: int16,
      },
    });
    const stateModel = new Model(state);
    const buffer = stateModel.toBuffer({
      b: 'wow',
      e: [{x: 1, y: 1}],
      g: [1, 2, 3],
      a: 2,
      f: {y: 3, x: 3},
      d: {
        two: 4,
        one: 4,
      },
    });
    const dataView = new DataView(buffer);

    // Beginning should be root id
    const rootId = deserializeString(dataView, string8, 0, 5);
    expect(rootId).toStrictEqual(stateModel.id);

    // First property `a`
    expect(dataView.getUint8(5)).toStrictEqual(2);

    // Second property `b`
    const propB = deserializeString(dataView, string8, 6, 9);
    expect(propB).toStrictEqual('wow');

    // Third property `g`
  });
});
