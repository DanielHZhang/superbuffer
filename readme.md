<div align="center">

# Superbuffer

A simple way to serialize JavaScript objects into ArrayBuffers for high compression on the wire.

[Introduction][intro-url] • [Usage][usage-url] • [Data Types][data-types-url] • [Caveats][caveats-url]

</div>

---

## Introduction

Superbuffer makes it easy to serialize and deserialize data from ArrayBuffers matching the interfaces you define. Its Schema-Model API was inspired by [typed-array-buffer-schema][tabs-url].

Superbuffer was designed to balance the readability and flexibility JSON while maximizing compression of your data on the wire. It is especially useful in situations where a high volume and frequency of network traffic between clients is necessary (such as multiplayer networked games).

## Installation

**NPM**

```
npm i superbuffer
```

**Yarn**

```
yarn add superbuffer
```

## Usage API

Superbuffer allows you to define the shape of the data you want to serialize:

```typescript
import {Schema, Model, uint32, uint64, int16, string} from 'superbuffer';

const commentSchema = new Schema({
  message: string,
  timestamp: uint64,
  votes: int16,
});

const postSchema = new Schema({
  id: uint32,
  title: string,
  tags: [string],
  author: {
    id: uint32,
    name: string,
  },
  comments: [commentSchema],
});

const post = new Model(postSchema);
```

If you use Typescript, Superbuffer automatically ensures your data has proper typings:

```typescript
import {Model, float32} from 'superbuffer';
const position = Model.fromSchemaDefinition({
  x: float32,
  y: float32,
});

// Typescript knows that only objects with type
// {x: number, y: number} can be serialized by the `position` model
const buffer = position.toBuffer({x: 32.1, y: 12.3});

// Typescript knows `result` is of type {x: number, y: number}
const result = position.fromBuffer(buffer);
```

Superbuffer can serialize any non-circular JSON structure:

```typescript
import {Schema, Model, views, ExtractSchemaObject} from 'superbuffer';

const {int16, int32, uint8, uint32, uint64, float32, boolean, string} = views;

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

/** Client */
// JSON.stringify(snapshot) = 430 bytes
// model.toBuffer(snapshot) = 139 bytes
// 68% compression!
const buffer = snapshotModel.toBuffer(snapshot); // Object to ArrayBuffer
network.emit(buffer);

/** Server */
network.on('message', (buffer) => {
  const id = Model.getIdFromBuffer(buffer);
  if (id === snapshotModel.schema.id) {
    const result = snapshotModel.fromBuffer(buffer); // ArrayBuffer to object
  }
});
```

## Data Types

Superbuffer's views are mapped to their respective [TypedArray][typed-array-url] countparts:

| Superbuffer View | TypedArray Equivalent | Value Range                  | Byte Size |
| ---------------- | --------------------- | ---------------------------- | --------- |
| uint8            | Uint8Array            | 0 to 255                     | 1         |
| uint16           | Uint16Array           | 0 to 65535                   | 2         |
| uint32           | Uint32Array           | 0 to 4294967295              | 4         |
| uint64           | Uint64Array           | 0 to 2^64\-1                 | 8         |
| int8             | Int8Array             | \-128 to 127                 | 1         |
| int16            | Int16Array            | \-32768 to 32767             | 2         |
| int32            | Int32Array            | \-2147483648 to 2147483647   | 4         |
| int64            | Int64Array            | \-2^63 to 2^63\-1            | 8         |
| float32          | Float32Array          | 1\.2×10^\-38 to 3\.4×10^38   | 4         |
| float64          | Float64Array          | 5\.0×10^\-324 to 1\.8×10^308 | 8         |
| string           | Uint8Array            | UTF\-8 encoding              | variable  |
| boolean          | Uint8Array            | 0 or 1                       | 1         |

## Caveats

- Max array length of 65535 (uint16)
- Max number of schema ids is 255 (uint8)
- No `"` character in strings
- No `null/undefined` properties: all properties of the schema definition must be present on an object to be serialized (empty arrays are allowed)

## License

[MIT License][mit-url]

[intro-url]: https://github.com/DanielHZhang/superbuffer#introduction
[usage-url]: https://github.com/DanielHZhang/superbuffer#usage-api
[data-types-url]: https://github.com/DanielHZhang/superbuffer#data-types
[caveats-url]: https://github.com/DanielHZhang/superbuffer#caveats
[tabs-url]: https://github.com/geckosio/typed-array-buffer-schema
[typed-array-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
[mit-url]: https://github.com/DanielHZhang/superbuffer/blob/main/license.md
