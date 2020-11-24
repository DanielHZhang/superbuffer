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
  boolean,
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
      Model.fromSchemaDefinition(
        {
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
        },
        i
      );
      const perfEnd = performance.now();
      deltas.push(perfEnd - perfStart);
      Schema.instances.delete(i);
    }
    console.info(`Model.fromSchemaDefinition():
    Ops/sec: ${opsPerSec(deltas).toPrecision(5)}
    Average: ${average(deltas).toPrecision(5)}ms
    Median: ${median(deltas).toPrecision(5)}ms`);
  });

  const monsterSchema = new Schema({
    id: uint8,
    health: uint8,
    units: [int16],
  });
  const playerSchema = new Schema({
    id: uint8,
    x: int16,
    y: int16,
    health: uint8,
  });
  const inputSchema = new Schema({action: uint8, movement: uint8});
  const listSchema = new Schema({value: int32});
  const snapshotModel = Model.fromSchemaDefinition({
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
  const snapshotBuffer = snapshotModel.toBuffer(snapshot);

  it('Should have performant object serialization', () => {
    for (let i = 0; i < iterations; i++) {
      const perfStart = performance.now();
      snapshotModel.toBuffer(snapshot);
      const perfEnd = performance.now();
      deltas.push(perfEnd - perfStart);
    }
    console.info(`Model.toBuffer():
    Ops/sec: ${opsPerSec(deltas).toPrecision(5)}
    Average: ${average(deltas).toPrecision(5)}ms
    Median: ${median(deltas).toPrecision(5)}ms`);
  });

  it('Should have performant object deserialization', () => {
    for (let i = 0; i < iterations; i++) {
      const perfStart = performance.now();
      snapshotModel.fromBuffer(snapshotBuffer);
      const perfEnd = performance.now();
      deltas.push(perfEnd - perfStart);
    }
    console.info(`Model.fromBuffer():
    Ops/sec: ${opsPerSec(deltas).toPrecision(5)}
    Average: ${average(deltas).toPrecision(5)}ms
    Median: ${median(deltas).toPrecision(5)}ms`);
  });

  it('Should have higher compression than JSON', () => {
    const buffer = snapshotModel.toBuffer(snapshot);
    const json = JSON.stringify(snapshot);
    const jsonByteLength = Buffer.byteLength(json, 'utf-8');
    const savings = (1 - buffer.byteLength / jsonByteLength) * 100;
    expect(buffer.byteLength).toBeLessThan(jsonByteLength);
    console.info(`Compression:
    Original: ${jsonByteLength} bytes
    Compressed: ${buffer.byteLength} bytes
    Space savings: ${savings.toPrecision(2)}%`);
  });

  it('same', () => {
    // const {int16, int32, uint8, uint32, uint64, float32, boolean, string} = views;
    const playerSchema = new Schema({
      id: uint8,
      x: float32,
      y: float32,
      health: uint8,
      alive: boolean,
    });
    const inputSchema = new Schema({action: int16, movement: int16});
    const listSchema = new Schema({value: int32});
    const snapshotModel = Model.fromSchemaDefinition({
      time: uint64,
      sequenceNumber: uint32,
      input: inputSchema,
      messages: [string],
      data: {
        list: [listSchema],
        players: [playerSchema],
      },
    });
    type Snapshot = ExtractSchemaObject<typeof snapshotModel>;
    const snapshot: Snapshot = {
      time: BigInt(Date.now()),
      sequenceNumber: 438923,
      input: {
        action: -12,
        movement: -4,
      },
      messages: ['hello', 'hi', 'how are you', 'im good, how are you', 'fine thank you'],
      data: {
        list: [{value: 1}, {value: 2}, {value: 3}, {value: 4}, {value: 5}],
        players: [
          {id: 14, x: 145.32, y: 98.1123, health: 99, alive: true},
          {id: 15, x: 218.46, y: -14.0934, health: 100, alive: true},
          {id: 0, x: 3289.554, y: -1432.0, health: 0, alive: false},
        ],
      },
    };
    // Client
    const buffer = snapshotModel.toBuffer(snapshot); // Object -> ArrayBuffer
    console.log(buffer.byteLength);
    console.log(Buffer.byteLength(JSON.stringify({...snapshot, time: snapshot.time.toString()})));
  });
});
