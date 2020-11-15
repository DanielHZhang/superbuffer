import {int16, int32, int8, Schema, string16, string8, uint16, uint32, uint8} from '../src';

describe('Schema class', () => {
  afterEach(() => {
    // @ts-ignore 2341
    Schema._schemas.clear();
  });

  it('Should sort properties of the same type alphabetically', () => {
    // Only typed views in schema
    const onlyTypedViews = new Schema('primatives', {
      b: string8,
      a: uint8,
      c: uint32,
    });
    const keyOrder = Object.keys(onlyTypedViews.struct);
    expect(keyOrder).toStrictEqual(['a', 'b', 'c']);

    // Only objects in schema
    const onlyObjects = new Schema('objects', {
      c: {
        f: string16,
      },
      b: {
        y: int16,
        z: int16,
        x: int16,
      },
      a: {
        e: int32,
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
      b: [string8],
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
    const nested = new Schema('nested', {y: uint8, x: uint8});
    const state = new Schema('state', {
      e: [nested],
      b: string8,
      g: [uint16],
      a: uint8,
      f: nested,
      d: {
        y: int16,
        z: int16,
        x: int16,
      },
      c: uint32,
      h: [string8],
    });
    expect(Object.keys(state.struct)).toStrictEqual(['a', 'b', 'c', 'g', 'h', 'd', 'f', 'e']);
  });
});
