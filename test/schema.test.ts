import {float32, float64, int16, int8, Schema, string, uint16, uint32, uint64, uint8} from '../src';

describe('Schema class', () => {
  afterEach(() => {
    // @ts-ignore 2341
    Schema._schemas.clear();
  });

  it('Should sort properties of the same type alphabetically', () => {
    // Only typed views in schema
    const onlyTypedViews = new Schema('primatives', {
      b: string,
      a: uint8,
      c: uint32,
    });
    const keyOrder = Object.keys(onlyTypedViews.struct);
    expect(keyOrder).toStrictEqual(['a', 'b', 'c']);

    // Only objects in schema
    const onlyObjects = new Schema('objects', {
      c: {
        f: string,
      },
      b: {
        y: int16,
        z: int16,
        x: int16,
      },
      a: {
        e: float32,
        d: uint8,
      },
    });
    expect(Object.keys(onlyObjects.struct)).toStrictEqual(['a', 'b', 'c']);
    expect(Object.keys(onlyObjects.struct.b)).toStrictEqual(['x', 'y', 'z']);
    expect(Object.keys(onlyObjects.struct.a)).toStrictEqual(['d', 'e']);

    // Only nested schemas in schema
    const nested = new Schema('nested', {y: uint8, x: uint8});
    const root = new Schema('rootNestedSchemas', {
      d: nested,
      a: nested,
      c: nested,
      b: nested,
    });
    expect(Object.keys(root.struct)).toStrictEqual(['a', 'b', 'c', 'd']);

    // Only typed view arrays in schema
    const onlyViewArrays = new Schema('onlyViewArrays', {
      d: [uint32],
      a: [int8],
      c: [uint16],
      b: [string],
    });
    expect(Object.keys(onlyViewArrays.struct)).toStrictEqual(['a', 'b', 'c', 'd']);

    // Only schema arrays in schema
    const onlySchemaArrays = new Schema('onlySchemaArrays', {
      d: [nested],
      a: [nested],
      c: [nested],
      b: [nested],
    });
    expect(Object.keys(onlySchemaArrays.struct)).toStrictEqual(['a', 'b', 'c', 'd']);
  });

  it('Should sort properties of different types in the proper order', () => {
    const nested = new Schema('nested', {y: uint8, x: float64});
    const state = new Schema('state', {
      e: [nested],
      b: string,
      g: [uint16],
      a: uint8,
      f: nested,
      d: {
        y: float64,
        z: uint64,
        x: int16,
      },
      c: uint32,
      h: [string],
    });
    expect(Object.keys(state.struct)).toStrictEqual(['a', 'b', 'c', 'g', 'h', 'd', 'f', 'e']);
  });

  it('Should throw when there are identical names', () => {
    expect(() => {
      new Schema('name', {x: uint8, y: int8});
      new Schema('name', {y: int8, x: uint8});
    }).toThrow();
  });

  it('Should read the Schema id from the buffer', () => {
    const model = Model.fromSchemaDefinition('mySchema', {
      id: uint8,
      x: {type: uint16, digits: 4},
    });
    const state = {id: 0, x: 1.2345};
    const buffer = model.toBuffer(state);
    const bufferId = Model.getIdFromBuffer(buffer);
    const schemaId = model.schema.id;
    const modelId = model.id;

    expect(bufferId).toBe(schemaId);
    expect(schemaId).toBe(modelId);
  });
});
