import {performance} from 'perf_hooks';
import {
  ExtractSchemaObject,
  int16,
  Model,
  Schema,
  uint8,
  uint16,
  uint32,
  uint64,
  int8,
  float32,
  float64,
  string,
  int32,
} from '../src';

const median = (array: number[]): number => {
  if (array.length === 0) {
    return NaN;
  }
  if (array.length === 1) {
    return array[0];
  }
  const sorted = array.sort();
  if (sorted.length % 2 === 0) {
    const mid = Math.floor(sorted.length / 2);
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[Math.floor(sorted.length / 2)];
};

const average = (array: number[]): number => {
  if (array.length === 0) {
    return NaN;
  }
  if (array.length === 1) {
    return array[0];
  }
  const sum = array.reduce((acc, value) => acc + value, 0);
  return sum / array.length;
};

const opsPerSec = (array: number[]): number => {
  return median(array.map((value) => 1000 / value));
};

describe('Benchmark', () => {
  const iterations = 1000;
  const deltas: number[] = [];

  beforeEach(() => {
    deltas.length = 0;
    Schema.instances.clear();
  });

  it('Should have performant model creation', () => {
    for (let i = 0; i < iterations; i++) {
      const perfStart = performance.now();
      Model.fromSchemaDefinition(i.toString(), {
        f: int8,
        a: uint8,
        g: int16,
        p: {
          r: [string],
          q: [uint8],
          s: {
            t: int16,
          },
        },
        n: string,
        b: {
          d: uint32,
          m: [string],
          c: uint16,
        },
        h: {
          l: [uint8],
          j: {
            u: [float32],
            k: float64,
          },
          o: string,
          i: float32,
        },
        e: uint64,
      });
      const perfEnd = performance.now();
      deltas.push(perfEnd - perfStart);
      Schema.instances.delete(i.toString());
    }
    console.info(`Model creation time:
    Average: ${average(deltas).toPrecision(5)}ms
    Median: ${median(deltas).toPrecision(5)}ms`);
  });

  const monsterSchema = new Schema('monster', {
    id: uint8,
    health: uint8,
    units: [int16],
  });
  const playerSchema = new Schema('player', {
    id: uint8,
    x: int16,
    y: int16,
    health: uint8,
  });
  const inputSchema = new Schema('input', {action: uint8, movement: uint8});
  const listSchema = new Schema('list', {value: int32});
  const snapshotModel = Model.fromSchemaDefinition('snapshot', {
    time: uint16,
    sequenceNumber: uint32,
    input: inputSchema,
    messages: [string],
    data: {
      list: [listSchema],
      players: [playerSchema],
      monsters: [monsterSchema],
    },
  });
  const snapshot: ExtractSchemaObject<typeof snapshotModel> = {
    time: 1234,
    sequenceNumber: 4389,
    input: {
      action: 12,
      movement: 4,
    },
    messages: ['hello', 'hi', 'how are you', 'im good, how are you', 'fine thank you'],
    data: {
      list: [{value: 1}, {value: 2}, {value: 3}, {value: 4}, {value: 5}],
      monsters: [
        {id: 2, health: 81, units: [-123, 123, 3, 45, 767, 32, -3, 65, 23]},
        {id: 1, health: 100, units: [96, 34, 5, -21, 23]},
      ],
      players: [
        {
          id: 14,
          x: 145,
          y: 98,
          health: 99,
        },
        {
          id: 15,
          x: 218,
          y: -14,
          health: 100,
        },
        {
          id: 0,
          x: 3289,
          y: -1432,
          health: 50,
        },
      ],
    },
  };

  it('Should have performant object serialization', () => {
    for (let i = 0; i < iterations; i++) {
      const perfStart = performance.now();
      snapshotModel.toBuffer(snapshot);
      const perfEnd = performance.now();
      deltas.push(perfEnd - perfStart);
    }

    console.info(`Model.toBuffer:
    Average: ${average(deltas).toPrecision(5)}ms
    Median: ${median(deltas).toPrecision(5)}ms`);
    // console.info(`Ops/sec: ${Math.round(opsPerSec(deltas))}`);
  });

  it('Should be faster than before', () => {
    const playerModel = Model.fromSchemaDefinition('player', {
      id: uint8,
      x: int16,
      y: int16,
    });
    const snapshotModel = Model.fromSchemaDefinition('snapshot', {
      time: uint16,
      data: {
        players: [playerModel.schema],
      },
    });
    const snap = {
      time: 1234,
      data: {
        players: [
          {id: 0, x: 22, y: 38},
          {id: 1, x: -54, y: 7},
        ],
      },
    };
    const iterations = 100000;
    const perfStart = performance.now();
    let buffer;
    let data = snap;
    for (let i = 0; i < iterations; i++) {
      buffer = snapshotModel.toBuffer(data);
      data = snapshotModel.fromBuffer(buffer, Model.BUFFER_OBJECT);
    }

    const perfEnd = performance.now();
    const delta = perfEnd - perfStart;
    console.log(`Execution time: ${delta}`);
  });

  it('Should have performant object deserialization', () => {
    // const wow = snapshotModel.toBuffer(snapshot);
    // const result = snapshotModel.fromBuffer(wow);
    // console.log(result);
    // let buffer;
    // let data = snapshot;
    // const iter = 100000;
    // const perfStart = performance.now();
    // for (let i = 0; i < iter; i++) {
    //   buffer = snapshotModel.toBuffer(data);
    //   data = snapshotModel.fromBuffer(buffer, Model.BUFFER_OBJECT);
    // }
    // const perfEnd = performance.now();
    // const delta = perfEnd - perfStart;
    // console.log(`Execution time: ${delta.toPrecision(5)}ms`);
    // const iterations = 10000;
    // const perfStart = performance.now();
    // for (let i = 0; i < iterations; i++) {
    //   buffer = snapshotModel.toBuffer(data);
    //   data = snapshotModel.fromBuffer(buffer);
    // }
    // const perfEnd = performance.now();
    // const delta = perfEnd - perfStart;
    // console.log(`Execution time: ${delta.toFixed(3)}ms`);
    // expect(JSON.stringify(data).length).toBe(JSON.stringify(snap).length);
  });
});
