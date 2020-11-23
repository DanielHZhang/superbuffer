const {Model, uint8, int16, uint16, Schema} = require('../lib');

const playerSchema = new Schema('player', {
  id: uint8,
  x: int16,
  y: int16,
});
const snapshotModel = Model.fromSchemaDefinition('snapshot', {
  time: uint16,
  data: {
    players: [playerSchema],
  },
});

const snapshot = {
  time: 1234,
  data: {
    players: [
      {id: 0, x: 22, y: 38},
      {id: 1, x: -54, y: 7},
    ],
  },
};

for (let i = 0; i < 1000; i++) {
  snapshotModel.toBuffer(snapshot);
}
