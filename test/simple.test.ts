import {Model, uint8, int16, uint16, Schema} from '../src/index';

describe('Simple real-world test', () => {
  const castleSchema = new Schema('castle', {
    id: uint8,
    health: uint8,
  });

  const playerSchema = new Schema('player', {
    id: uint8,
    // x: { type: int16, digits: 2 },
    // y: { type: int16, digits: 2 },
    x: int16,
    y: int16,
  });

  const listSchema = new Schema('list', {
    value: uint8,
  });

  const snapshotModel = Model.fromSchemaDefinition('snapshot', {
    time: uint16,
    single: uint8,
    data: {
      list: [listSchema],
      players: [playerSchema],
      castles: [castleSchema],
    },
  });

  const snap = {
    time: 1234,
    single: 0,
    data: {
      list: [{value: 1}, {value: 2}],
      castles: [{id: 2, health: 81}],
      players: [
        {
          id: 14,
          x: 145,
          y: 98,
        },
        {
          id: 15,
          x: 218,
          y: -14,
        },
      ],
    },
  };

  let buffer: ArrayBuffer;
  let data: any;

  test('get schema name', () => {
    expect(castleSchema.name).toBe('castle');
  });

  test('should return a buffer', () => {
    buffer = snapshotModel.toBuffer(snap);
    const uint8 = new Uint8Array(buffer);

    expect(typeof buffer).toBe('object');
    expect(uint8.buffer.byteLength).toBe(37);
  });

  test('should fromBuffer', () => {
    data = snapshotModel.fromBuffer(buffer);

    expect(data.time).toBe(1234);
    expect(data.data.players[0].x).toBe(145);
  });

  test('stringified version should have same length', () => {
    expect(JSON.stringify(snap).length).toBe(JSON.stringify(data).length);
  });
});
