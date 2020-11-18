import {performance} from 'perf_hooks';
import {Model, uint8, int16, uint16} from '../src/index';
import type {ExtractModelDefinition} from '../src/types';

describe('Benchmark', () => {
  // type Player = {id: number; x: number; y: number};

  const playerModel = Model.fromSchemaDefinition('player', {
    id: uint8,
    x: int16,
    y: int16,
  });

  // type Snapshot = {
  //   time: number;
  //   data: {players: Player[]};
  // };

  const snapshotModel = Model.fromSchemaDefinition('snapshot', {
    time: uint16,
    data: {
      players: [playerModel.schema],
    },
  });

  const snap: Snapshot = {
    time: 1234,
    data: {
      players: [
        {id: 0, x: 22, y: 38},
        {id: 1, x: -54, y: 7},
      ],
    },
  };

  let buffer: ArrayBuffer;
  let data = snap;

  it('Should be as performant as possible', () => {
    const iterations = 10000;
    const perfStart = performance.now();

    for (let i = 0; i < iterations; i++) {
      buffer = snapshotModel.toBuffer(data);
      data = snapshotModel.fromBuffer(buffer);
    }

    const perfEnd = performance.now();
    const delta = perfEnd - perfStart;
    console.log(`Execution time: ${delta.toFixed(3)}ms`);

    expect(JSON.stringify(data).length).toBe(JSON.stringify(snap).length);
  });
});
