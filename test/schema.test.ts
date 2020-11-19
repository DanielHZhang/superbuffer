import {bigint, float, int, Schema, string, uint} from '../src';

describe('Schema class', () => {
  afterEach(() => {
    // @ts-ignore 2341
    Schema._schemas.clear();
  });

  it('Should sort properties of the same type alphabetically', () => {
    // Only typed views in schema
    const onlyTypedViews = new Schema('primatives', {
      b: string(8),
      a: uint(8),
      c: uint(32),
    });
    const keyOrder = Object.keys(onlyTypedViews.struct);
    expect(keyOrder).toStrictEqual(['a', 'b', 'c']);

    // Only objects in schema
    const onlyObjects = new Schema('objects', {
      c: {
        f: string(16),
      },
      b: {
        y: int(16),
        z: int(16),
        x: int(16),
      },
      a: {
        e: float(32),
        d: uint(8),
      },
    });
    expect(Object.keys(onlyObjects.struct)).toStrictEqual(['a', 'b', 'c']);
    expect(Object.keys(onlyObjects.struct.b)).toStrictEqual(['x', 'y', 'z']);
    expect(Object.keys(onlyObjects.struct.a)).toStrictEqual(['d', 'e']);

    // Only nested schemas in schema
    const nested = new Schema('nested', {y: uint(8), x: uint(8)});
    const root = new Schema('rootNestedSchemas', {
      d: nested,
      a: nested,
      c: nested,
      b: nested,
    });
    expect(Object.keys(root.struct)).toStrictEqual(['a', 'b', 'c', 'd']);

    // Only typed view arrays in schema
    const onlyViewArrays = new Schema('onlyViewArrays', {
      d: [uint(32)],
      a: [int(8)],
      c: [uint(16)],
      b: [string(8)],
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
    const nested = new Schema('nested', {y: uint(8), x: uint(8)});
    const state = new Schema('state', {
      e: [nested],
      b: string(16),
      g: [uint(16)],
      a: uint(8),
      f: nested,
      d: {
        y: float(64),
        z: bigint({signed: false}),
        x: int(16),
      },
      c: uint(32),
      h: [string(8)],
    });
    expect(Object.keys(state.struct)).toStrictEqual(['a', 'b', 'c', 'g', 'h', 'd', 'f', 'e']);
  });

  it('Should throw when there are identical names', () => {
    expect(() => {
      new Schema('name', {x: uint(8), y: int(8)});
      new Schema('name', {y: int(8), x: uint(8)});
    }).toThrow();
  });

  it('Should throw when there are circular references', () => {
    expect(() => {

      const first = new Schema('1', {x: uint(8)});
      const second = new Schema('2', {one: first});
      const third = new Schema('3', {one: first, two: second});
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

    }).toThrow();
  });
});
