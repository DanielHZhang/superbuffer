import {Model, Schema, uint8, int16, uint16} from '../src/index';

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
