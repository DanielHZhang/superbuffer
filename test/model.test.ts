import {
  boolean,
  ExtractSchemaObject,
  float32,
  float64,
  int16,
  int32,
  int64,
  int8,
  Model,
  Schema,
  string,
  TypedArrayName,
  uint16,
  uint32,
  uint64,
  uint8,
} from '../src';
import {getTypedArrayByName} from '../src/utils';

describe('Model class', () => {
  beforeEach(() => {
    Schema.instances.clear();
  });

  it('Should read the schema id from an ArrayBuffer', () => {
    const model = Model.fromSchemaDefinition({id: uint8, x: float32});
    const buffer = model.toBuffer({id: 12, x: 1.2345});
    expect(Model.getIdFromBuffer(buffer)).toStrictEqual(model.schema.id);
  });

  it('Should serialize the buffer type at index 0', () => {
    const model = Model.fromSchemaDefinition({id: uint8, x: uint16});
    const objectBuffer = model.toBuffer({id: 0, x: 1.2345});
    const arrayBuffer = model.toBuffer([
      {id: 0, x: 0.1234},
      {id: 1, x: 1.2345},
    ]);
    const objectBufferView = new DataView(objectBuffer);
    const arrayBufferView = new DataView(arrayBuffer);
    expect(objectBufferView.getUint8(0)).toStrictEqual(Model.BUFFER_OBJECT);
    expect(arrayBufferView.getUint8(0)).toStrictEqual(Model.BUFFER_ARRAY);
  });

  it('Should deserialize uint8', () => {
    const model = Model.fromSchemaDefinition({x: uint8, y: uint8});
    const object = {x: 255, y: 0};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize uint16', () => {
    const model = Model.fromSchemaDefinition({x: uint16, y: uint16});
    const object = {x: 0, y: 65535};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize uint32', () => {
    const model = Model.fromSchemaDefinition({x: uint32, y: uint32});
    const object = {x: 0, y: 4294967295};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize int8', () => {
    const model = Model.fromSchemaDefinition({x: int8, y: int8});
    const object = {x: -128, y: 127};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize int16', () => {
    const model = Model.fromSchemaDefinition({x: int16, y: int16});
    const object = {x: -32768, y: 32767};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize int32', () => {
    const model = Model.fromSchemaDefinition({x: int32, y: int32});
    const object = {x: -2147483648, y: 2147483647};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  const truncate = (obj: Record<string, number>, precision: 7 | 16) => {
    const newObj: Record<string, number> = {};
    for (const key of Object.keys(obj)) {
      newObj[key] = Number(obj[key].toPrecision(precision));
    }
    return newObj;
  };

  it('Should deserialize float32', () => {
    const model = Model.fromSchemaDefinition({x: float32, y: float32});
    const object = {x: 1.1234567, y: 1234567.1234567};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(truncate(object, 7));
  });

  it('Should deserialize float64', () => {
    const model = Model.fromSchemaDefinition({x: float64, y: float64});
    const object = {x: -123.123456789101112, y: 376.9876543212345};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(truncate(object, 16));
  });

  it('Should deserialize biguint64', () => {
    const model = Model.fromSchemaDefinition({x: uint64, y: uint64});
    const object = {x: BigInt(0), y: BigInt(2 ** 64) - BigInt(1)};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result.x.toString()).toStrictEqual(object.x.toString());
    expect(result.y.toString()).toStrictEqual(object.y.toString());
  });

  it('Should deserialize bigint64', () => {
    const model = Model.fromSchemaDefinition({x: int64, y: int64});
    const object = {x: BigInt(-(2 ** 63)), y: BigInt(2 ** 63) - BigInt(1)};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result.x.toString()).toStrictEqual(object.x.toString());
    expect(result.y.toString()).toStrictEqual(object.y.toString());
  });

  it('Should deserialize string', () => {
    const model = Model.fromSchemaDefinition({x: string, y: string});
    const object = {x: 'this is some string', y: 'this is another string'};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result).toStrictEqual(object);
  });

  it('Should deserialize boolean', () => {
    const model = Model.fromSchemaDefinition({x: boolean, y: boolean});
    const object = {x: true, y: false};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result).toStrictEqual(object);
  });

  it('Should deserialize BufferView array', () => {
    const model = Model.fromSchemaDefinition({
      x: [int16],
      y: [float32],
      z: [string],
      a: [uint64],
    });
    const object = {
      a: [BigInt(2 ** 40), BigInt(1e10)],
      y: [69.42019234, 32.4380123, -21.234635, 0.239203949, 1.28813e-2],
      z: ['array', 'of', 'string', 'a', 'bb', 'ccc', '12323', '!@&^*#@@$)', '+_)()[]{}', '<>?/:;'],
      x: [-1, -2, -3, -2e3, 0, 1, 2, 3, 9821],
    };
    const buffer = model.toBuffer(object);
    const {a, ...rest} = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(a[0].toString()).toStrictEqual(a[0].toString()); // Workaround for Jest bigint issue
    expect(a[1].toString()).toStrictEqual(a[1].toString());
    expect(rest).toStrictEqual({
      x: object.x,
      y: object.y.map((val) => Number(val.toPrecision(7))),
      z: object.z,
    });
  });

  it('Should deserialize nested objects', () => {
    const model = Model.fromSchemaDefinition({
      x: {
        y: {
          z: uint8,
        },
        x: {
          y: uint16,
          z: string,
        },
      },
      a: {
        b: {
          c: int32,
          d: string,
        },
        c: uint8,
        d: string,
      },
    });
    const object: ExtractSchemaObject<typeof model> = {
      x: {
        y: {
          z: 123,
        },
        x: {
          y: 28349,
          z: 'hello this is a test message',
        },
      },
      a: {
        b: {
          c: -123456,
          d: 'this is another very very long test string that should work',
        },
        c: 2,
        d: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor',
      },
    };
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize nested Schemas', () => {
    const nested1 = new Schema({foo: string});
    const nested2 = new Schema({bar: float64, lorem: nested1});
    const model = Model.fromSchemaDefinition({
      x: nested1,
      y: {
        z: nested1,
        a: {
          b: nested2,
        },
        c: nested2,
      },
      z: nested2,
    });
    const object: ExtractSchemaObject<typeof model> = {
      x: {foo: 'foo string'},
      y: {
        z: {foo: 'another foo string'},
        a: {
          b: {bar: 1337.8008, lorem: {foo: 'ipsum'}},
        },
        c: {bar: 92.12323901, lorem: {foo: 'foo 2 electric boogaloo'}},
      },
      z: {
        bar: 0.00662607004,
        lorem: {foo: '#i^gH%4=Qsyj[_5An~iXWR>V^d~w&B<jrBu/db:lL_F9HRfa9DPF{mtwEp!poK`GG'},
      },
    };
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize nested Schema arrays', () => {
    const nested1 = new Schema({foo: string});
    const nested2 = new Schema({bar: float64, lorem: [nested1]});
    const model = Model.fromSchemaDefinition({
      x: [nested1],
      y: [nested2],
    });
    const object: ExtractSchemaObject<typeof model> = {
      x: [{foo: '1'}, {foo: '22'}, {foo: '333'}],
      y: [
        {bar: 123.456, lorem: [{foo: 'abcd'}, {foo: 'cdba'}]},
        {bar: 0.991235, lorem: [{foo: 'hello'}]},
        {bar: 123225.23425, lorem: [{foo: 'wow'}, {foo: 'very'}, {foo: 'cool'}]},
      ],
    };
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize array buffer type', () => {
    const nested1 = new Schema({foo: string});
    const nested2 = new Schema({bar: float64, lorem: [nested1]});
    const model = Model.fromSchemaDefinition({
      x: [nested1],
      y: [nested2],
      z: {
        a: nested2,
        b: uint8,
        c: string,
      },
    });
    const object: ExtractSchemaObject<typeof model> = {
      x: [{foo: '1'}, {foo: '22'}, {foo: '333'}],
      y: [
        {bar: 123.456, lorem: [{foo: 'abcd'}, {foo: 'cdba'}]},
        {bar: 0.991235, lorem: [{foo: 'hello'}]},
        {bar: 123225.23425, lorem: [{foo: 'wow'}, {foo: 'very'}, {foo: 'cool'}]},
      ],
      z: {
        a: {
          bar: 0.00662607004,
          lorem: [{foo: '#i^gH%4=Qsyj[_5An~iXWR>V^d~w&B<jrBu/db:lL_F9HRfa9DPF{mtwEp!poK`GG'}],
        },
        b: 255,
        c: 'testing 1 2 3',
      },
    };
    const buffer = model.toBuffer([object, object, object, object]);
    const results = model.fromBuffer(buffer, Model.BUFFER_ARRAY);
    expect(results.length).toStrictEqual(4);
    for (const result of results) {
      expect(result).toStrictEqual(object);
    }
    expect(() => model.fromBuffer(buffer, Model.BUFFER_OBJECT)).toThrow();
    expect(() => {
      const nestedModal = new Model(nested2);
      nestedModal.fromBuffer(buffer);
    }).toThrow();
  });

  it('Should handle empty arrays', () => {
    const playerSchema = new Schema({id: uint8});
    const botSchema = new Schema({id: uint16});
    const snapshotModel = Model.fromSchemaDefinition({
      time: uint16,
      data: {
        players: [playerSchema],
        bots: [botSchema],
      },
    });
    const snapshot: ExtractSchemaObject<typeof snapshotModel> = {
      time: 20,
      data: {
        players: [],
        bots: [],
      },
    };
    const buffer = snapshotModel.toBuffer(snapshot);
    expect(snapshotModel.fromBuffer(buffer)).toStrictEqual(snapshot);
  });

  it('Should serialize directly to TypedArray', () => {
    const playerSchema = new Schema({id: uint8});
    const botSchema = new Schema({id: uint16});
    const snapshotModel = Model.fromSchemaDefinition({
      time: uint16,
      data: {
        players: [playerSchema],
        bots: [botSchema],
      },
    });
    const snapshot: ExtractSchemaObject<typeof snapshotModel> = {
      time: 2000,
      data: {
        players: [{id: 4}, {id: 2}],
        bots: [{id: 1000}, {id: 1234}],
      },
    };
    const names: TypedArrayName[] = [
      'Uint8',
      'Uint16',
      'Uint32',
      'Int8',
      'Int16',
      'Int32',
      'Float32',
      'Float64',
      'BigInt64',
      'BigUint64',
    ];
    // @ts-expect-error
    expect(() => snapshotModel.toBuffer(snapshot, 'BadEncoding')).toThrow();
    for (const name of names) {
      const typedArray = snapshotModel.toBuffer(snapshot, name as 'Uint8'); // Cast to fix overload type mismatch
      expect(ArrayBuffer.isView(typedArray)).toBe(true);
      expect(typedArray instanceof getTypedArrayByName(name)).toBe(true);
      const converted = snapshotModel.fromBuffer(typedArray);
      expect(converted).toStrictEqual(snapshot);
    }
  });
});
