import {float32, float64, int16, int8, Schema, string, uint16, uint32, uint64, uint8} from '../src';

describe('Schema class', () => {
  beforeEach(() => {
    Schema.instances.clear();
  });

  it('Should sort properties of the same type alphabetically', () => {
    // Only typed views in schema
    const onlyTypedViews = new Schema({
      a: uint8,
      c: uint32,
    });
    const keyOrder = Object.keys(onlyTypedViews.struct);
    expect(keyOrder).toStrictEqual(['a', 'c']);

    // Only objects in schema
    const onlyObjects = new Schema({
      c: {
        g: uint16,
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
    expect(Object.keys(onlyObjects.struct.a)).toStrictEqual(['d', 'e']);
    expect(Object.keys(onlyObjects.struct.b)).toStrictEqual(['x', 'y', 'z']);
    expect(Object.keys(onlyObjects.struct.c)).toStrictEqual(['g', 'f']);

    // Only nested schemas in schema
    const nested = new Schema({y: uint8, x: uint8});
    const root = new Schema({
      d: nested,
      a: nested,
      c: nested,
      b: nested,
    });
    expect(Object.keys(root.struct)).toStrictEqual(['a', 'b', 'c', 'd']);
  });

  it('Should sort properties of different types in the proper order', () => {
    const nested = new Schema({y: uint8, x: float64});
    const state = new Schema({
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
      i: nested,
    });
    expect(Object.keys(state.struct)).toStrictEqual(['a', 'c', 'g', 'b', 'h', 'd', 'f', 'i', 'e']);
  });

  it('Should throw when the id already exists', () => {
    expect(() => {
      new Schema({x: uint8, y: int8}, 1);
      new Schema({y: int8, x: uint8}, 1);
    }).toThrow();
  });

  it('Should create identical definitions as the class constructor', () => {
    const obj = {
      a: {
        b: {
          c: {
            d: uint16,
          },
        },
        a: {
          b: string,
        },
      },
    };
    const definition = Schema.definition(obj);
    const schema = new Schema(obj);
    expect(schema.struct).toStrictEqual(definition);
  });

  it('Should throw when the max number of schemas has been created', () => {
    expect(() => {
      for (let i = 0; i < 256; i++) {
        new Schema({a: uint16});
      }
    }).toThrow();
  });

  it('Should throw on bad schema definition structure', () => {
    expect(() => {
      // @ts-expect-error
      new Schema({a: 'bad type'});
    }).toThrow();

    expect(() => {
      new Schema({});
    }).toThrow();
  });
});
