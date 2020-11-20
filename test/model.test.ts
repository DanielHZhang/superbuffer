import {
  Model,
  Schema,
  int,
  string,
  uint,
  float,
  ExtractModelDefinition,
  ExtractModelObject,
  SchemaDefinition,
  BufferView,
} from '../src';

describe('Model class', () => {
  const deserializeString = (dataView: DataView, type: BufferView, start: number, end: number) => {
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

    const nested = new Schema('nested', {
      y: uint(8),
      x: uint(8),
    });
    const state = new Schema('state', {
      e: [nested],
      b: string(8),
      g: [uint(16)],
      a: int(8),
      f: nested,
      d: {
        two: float(32),
        one: int(16),
      },
    });
    const stateModel = new Model(state);

    const w = Schema.definition({
      e: [nested],
      b: string(8),
      g: [uint(16)],
      a: int(8),
      f: nested,
      d: {
        two: float(32),
        one: int(16),
      },
    });
    type What = ExtractModelDefinition<typeof stateModel>;
    type Same = ExtractModelObject<typeof stateModel>;

    const buffer = stateModel.toBuffer({
      b: 'wow',
      e: [{x: 1, y: 1}],
      g: [1, 2, 3],
      a: 2,
      f: {y: 3, x: 3},
      d: {
        two: 4.269,
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

describe('Empty data', () => {
  const playerSchema = new Schema('player', {
    id: uint8,
  });

  const botSchema = new Schema('bot', {
    id: uint8,
  });

  const carSchema = new Schema('car', {
    id: uint8,
  });

  const snapshotModel = Model.fromSchemaDefinition('snapshot', {
    time: uint16,
    data: {
      emptyArr: [playerSchema],
      emptyObj: botSchema,
      superCar: carSchema,
    },
  });

  const snap = {
    data: {
      emptyArr: [],
      emptyObj: {},
      superCar: {
        id: 911,
      },
    },
  };

  test('Empty arrays and empty objects are omitted', () => {
    const buffer = snapshotModel.toBuffer(snap);
    const dataL = JSON.stringify(snapshotModel.fromBuffer(buffer)).length;
    const snapL = JSON.stringify(snap).length;
    const emptiesL = '"emptyArr":[],"emptyObj":{},'.length;
    expect(dataL).toBe(snapL - emptiesL);
  });
});
