import {
  BufferView,
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
  uint16,
  uint32,
  uint64,
  uint8,
} from '../src';
import {ARRAY_HEADER, OBJECT_HEADER, SCHEMA_HEADER} from '../src/constants';
import {isBufferView} from '../src/utils';

describe('Model class', () => {
  beforeEach(() => {
    // @ts-ignore 2341
    Schema._schemas.clear();
  });

  it('Should read the schema id from an ArrayBuffer', () => {
    const model = Model.fromSchemaDefinition('test', {id: uint8, x: uint16});
    const buffer = model.toBuffer({id: 0, x: 1.2345});
    expect(Model.getIdFromBuffer(buffer)).toStrictEqual(model.schema.id);
  });

  it('Should serialize the buffer type at index 0', () => {
    const model = Model.fromSchemaDefinition('test', {id: uint8, x: uint16});
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

  it('Should serialize and flatten the data object', () => {
    const nested = new Schema('nested', {y: uint8, x: uint8});
    const state = new Schema('state', {
      e: [nested],
      b: string,
      g: [uint16],
      a: int8,
      f: nested,
      d: {
        two: float32,
        one: int16,
        three: {
          how: int32,
          about: int16,
        },
      },
      h: [string],
      i: float32,
    });
    const stateModel = new Model(state);
    const object = {
      b: 'wow',
      e: [
        {x: 1, y: 1},
        {x: 12, y: 12},
        {y: 123, x: 123},
      ],
      g: [1, 2, 3],
      a: 2,
      f: {y: 3, x: 3},
      d: {
        two: 4.269,
        one: 4,
        three: {
          how: -11234,
          about: -234,
        },
      },
      h: ['some', 'string', 'of variable', 'lengths', '1'],
      i: 3.1415,
    };
    const buffer = stateModel.toBuffer(object);
    const dataView = new DataView(buffer);
    const uint8Array = new Uint8Array(buffer);
    const decoder = new TextDecoder();
    const order = [
      [uint8, 1], // buffer type
      [uint16, SCHEMA_HEADER], // schema header
      [uint8, state.id], // schema id
      [int8, object.a], // a
      [float32, object.i], // i
      [uint16, ARRAY_HEADER], // array header (g)
      [uint16, object.g.length], // array num elements
      ...object.g.slice().map((value) => [uint16, value]), // g
      [string, object.b], // b
      [uint16, ARRAY_HEADER], // array header (h)
      [uint16, object.h.length], // aray num elements
      ...object.h.slice().map((value) => [string, value]), // h
      [uint16, OBJECT_HEADER], // object header (d)
      [int16, object.d.one], // one
      [float32, object.d.two], // two
      [uint16, OBJECT_HEADER], // object header (three)
      [int16, object.d.three.about], // about
      [int32, object.d.three.how], // how
      [uint16, SCHEMA_HEADER], // schema header (f)
      [uint8, nested.id], // schema id
      [uint8, object.f.x], // x
      [uint8, object.f.y], // y
      [uint16, ARRAY_HEADER], // array header (e)
      [uint16, object.e.length], // array num elements
      ...object.e.slice().flatMap((value) => [
        [uint16, SCHEMA_HEADER], // schema header
        [uint8, nested.id], // schema id
        [uint8, value.x], // x
        [uint8, value.y], // y
      ]),
    ];

    let offset = 0;
    for (const [view, expectedValue] of order) {
      if (!isBufferView(view)) {
        // Typescript improperly widens tuple type at array spread, this should never run
        throw new Error('Not buffer view.');
      }
      if (view.type === 'String') {
        const startingDoubleQuote = uint8Array[offset]; // Char code of " is 34
        const endQuoteIndex = uint8Array.indexOf(34, offset + 1);
        if (startingDoubleQuote !== 34 || endQuoteIndex < offset) {
          throw new Error('Buffer contains invalid string.');
        }
        const result = decoder.decode(uint8Array.subarray(offset + 1, endQuoteIndex));
        expect(result).toStrictEqual(expectedValue);
        offset = endQuoteIndex + 1;
      } else {
        let result = dataView[`get${view.type}` as const](offset);
        if (view.type === 'Float32' || view.type === 'Float64') {
          result = Number(result.toPrecision(view.type === 'Float32' ? 7 : 16));
        }
        expect(result).toStrictEqual(expectedValue);
        offset += view.bytes;
      }
    }
  });

  it('Should deserialize uint8', () => {
    const model = Model.fromSchemaDefinition('test', {x: uint8, y: uint8});
    const object = {x: 255, y: 0};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize uint16', () => {
    const model = Model.fromSchemaDefinition('test', {x: uint16, y: uint16});
    const object = {x: 0, y: 65535};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize uint32', () => {
    const model = Model.fromSchemaDefinition('test', {x: uint32, y: uint32});
    const object = {x: 0, y: 4294967295};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize int8', () => {
    const model = Model.fromSchemaDefinition('test', {x: int8, y: int8});
    const object = {x: -128, y: 127};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize int16', () => {
    const model = Model.fromSchemaDefinition('test', {x: int16, y: int16});
    const object = {x: -32768, y: 32767};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(object);
  });

  it('Should deserialize int32', () => {
    const model = Model.fromSchemaDefinition('test', {x: int32, y: int32});
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
    const model = Model.fromSchemaDefinition('test', {x: float32, y: float32});
    const object = {x: 1.1234567, y: 1234567.1234567};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(truncate(object, 7));
  });

  it('Should deserialize float64', () => {
    const model = Model.fromSchemaDefinition('test', {x: float64, y: float64});
    const object = {x: -123.123456789101112, y: 987876.12352374893845};
    const buffer = model.toBuffer(object);
    expect(model.fromBuffer(buffer)).toStrictEqual(truncate(object, 16));
  });

  it('Should deserialize biguint64', () => {
    const model = Model.fromSchemaDefinition('test', {x: uint64, y: uint64});
    const object = {x: BigInt(0), y: BigInt(2 ** 64) - BigInt(1)};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result.x.toString()).toStrictEqual(object.x.toString());
    expect(result.y.toString()).toStrictEqual(object.y.toString());
  });

  it('Should deserialize bigint64', () => {
    const model = Model.fromSchemaDefinition('test', {x: int64, y: int64});
    const object = {x: BigInt(-(2 ** 63)), y: BigInt(2 ** 63) - BigInt(1)};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result.x.toString()).toStrictEqual(object.x.toString());
    expect(result.y.toString()).toStrictEqual(object.y.toString());
  });

  it('Should deserialize string', () => {
    const model = Model.fromSchemaDefinition('test', {x: string, y: string});
    const object = {x: 'this is some string', y: 'this is another string'};
    const buffer = model.toBuffer(object);
    const result = model.fromBuffer(buffer, Model.BUFFER_OBJECT);
    expect(result).toStrictEqual(object);
  });

  // Should deserialize BufferView array, string array, nested object, nested Schema, nested Schema array, all

  // it('Should deserialize any BufferView type', () => {
  //   const simple = Model.fromSchemaDefinition('object', {
  //     w: string,
  //     x: uint8,
  //     y: uint16,
  //     z: uint32,
  //     a: uint64,
  //     b: int8,
  //     c: int16,
  //     d: int32,
  //     e: int64,
  //     f: float32,
  //     g: float64,
  //   });
  //   type SimpleState = ExtractSchemaObject<typeof simple>;
  //   const object: SimpleState = {
  //     y: 20,
  //     x: 10,
  //     a: BigInt(1.8e18),
  //     z: 4294967294,
  //     f: 1.1234567,
  //     w: 'wow some very sick big long string',
  //     b: -128,
  //     c: -32760,
  //     d: -2147483648,
  //     e: BigInt(-9007199254740991),
  //     g: 3.141592653589123,
  //   };
  //   const buffer = simple.toBuffer(object);
  //   const result = simple.fromBuffer(buffer, Model.BUFFER_OBJECT);
  //   for (const key in object) {
  //     // @ts-expect-error Required to avoid jest BigInt issues.
  //     expect(result[key]).toStrictEqual<Serializable>(object[key]);
  //   }
  // });
});

// describe('Empty data', () => {
//   const playerSchema = new Schema('player', {
//     id: uint8,
//   });

//   const botSchema = new Schema('bot', {
//     id: uint8,
//   });

//   const carSchema = new Schema('car', {
//     id: uint8,
//   });

//   const snapshotModel = Model.fromSchemaDefinition('snapshot', {
//     time: uint16,
//     data: {
//       emptyArr: [playerSchema],
//       emptyObj: botSchema,
//       superCar: carSchema,
//     },
//   });

//   const snap = {
//     data: {
//       emptyArr: [],
//       emptyObj: {},
//       superCar: {
//         id: 911,
//       },
//     },
//   };

//   test('Empty arrays and empty objects are omitted', () => {
//     const buffer = snapshotModel.toBuffer(snap);
//     const dataL = JSON.stringify(snapshotModel.fromBuffer(buffer)).length;
//     const snapL = JSON.stringify(snap).length;
//     const emptiesL = '"emptyArr":[],"emptyObj":{},'.length;
//     expect(dataL).toBe(snapL - emptiesL);
//   });
// });

// const first = new Schema('1', {x: uint8});
// const second = new Schema('2', {one: first});
// const third = new Schema('3', {one: first, two: second});

/**
third[]
^[]$ <- denote array
^02$ <- third object id
^{}$ <- index 0 third object starts here
^00$
1
^01$
^00$
2
,
^{}$ <- index 1 third object starts here
^00$
1
^01$
^00$
2
*/
// ^[]$
