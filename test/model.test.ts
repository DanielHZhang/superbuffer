import {
  Model,
  Schema,
  string,
  ExtractSchemaDefinition,
  ExtractSchemaObject,
  BufferView,
  uint16,
  int8,
  float32,
  int16,
  uint8,
  uint32,
  uint64,
  int32,
  int64,
  float64,
} from '../src';

describe('Model class', () => {
  // const deserializeString = (dataView: DataView, type: BufferView, start: number, end: number) => {
  //   let str = '';
  //   for (let i = 0; i < end - start; i++) {
  //     if (type._type === 'String8') {
  //       str += String.fromCharCode(dataView.getUint8(start + i));
  //     } else {
  //       str += String.fromCharCode(dataView.getUint16(start + i));
  //     }
  //   }
  //   return str;
  // };

  // it('Should flatten the data object properly', () => {
  //   // type Nested = {x: number; y: number};
  //   // type State = {
  //   //   e: Nested[];
  //   //   b: string;
  //   //   g: number[];
  //   //   a: number;
  //   //   f: Nested;
  //   //   d: {
  //   //     one: number;
  //   //     two: number;
  //   //   };
  //   // };

  //   const nested = new Schema('nested', {
  //     y: uint8,
  //     x: uint8,
  //   });
  //   const state = new Schema('state', {
  //     e: [nested],
  //     b: string,
  //     g: [uint16],
  //     a: int8,
  //     f: nested,
  //     d: {
  //       two: float32,
  //       one: int16,
  //     },
  //   });
  //   const stateModel = new Model(state);
  //   const buffer = stateModel.toBuffer({
  //     b: 'wow',
  //     e: [{x: 1, y: 1}],
  //     g: [1, 2, 3],
  //     a: 2,
  //     f: {y: 3, x: 3},
  //     d: {
  //       two: 4.269,
  //       one: 4,
  //     },
  //   });
  //   const dataView = new DataView(buffer);

  //   // // Beginning should be root id
  //   // const rootId = deserializeString(dataView, string, 0, 5);
  //   // expect(rootId).toStrictEqual(stateModel.schema.id);

  //   // // First property `a`
  //   // expect(dataView.getUint8(5)).toStrictEqual(2);

  //   // // Second property `b`
  //   // const propB = deserializeString(dataView, string, 6, 9);
  //   // expect(propB).toStrictEqual('wow');

  //   // Third property `g`
  // });

  it('Should deserialize any BufferView type', () => {
    const simple = Model.fromSchemaDefinition('object', {
      w: string,
      x: uint8,
      y: uint16,
      z: uint32,
      a: uint64,
      b: int8,
      c: int16,
      d: int32,
      e: int64,
      f: float32,
      g: float64,
    });
    type SimpleState = ExtractSchemaObject<typeof simple>;
    const object: SimpleState = {
      y: 20,
      x: 10,
      a: BigInt(1.8e18),
      z: 4294967294,
      f: 1.1234567,
      w: 'wow some very sick big long string',
      b: -128,
      c: -32760,
      d: -2147483648,
      e: BigInt(-9007199254740991),
      g: 3.141592653589123,
    };
    const buffer = simple.toBuffer(object);
    const result = simple.fromBuffer(buffer, Model.BUFFER_OBJECT);
    // expect(result).toStrictEqual(object);
    expect(result.a).toEqual(object.a);
  });
});

// it('Should deserialize uint16 object', () => {

// });

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
