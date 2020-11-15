import {int16, Model, Schema, string8, uint16, uint8} from '../src';

describe('Model class', () => {
  it('Flattens the object properly', () => {
    type Nested = {x: number; y: number};
    type State = {
      e: Nested[];
      b: string;
      g: number[];
      a: number;
      f: Nested;
      d: {
        one: number;
        two: number;
      };
    };

    const nested = new Schema<Nested>('nested', {y: uint8, x: uint8});
    const state = new Schema<State>('state', {
      e: [nested],
      b: string8,
      g: [uint16],
      a: uint8,
      f: nested,
      d: {
        two: int16,
        one: int16,
      },
    });
    const stateModel = new Model(state);
    stateModel.toBuffer({
      b: 'wow',
      e: [{x: 1, y: 1}],
      g: [1, 2, 3],
      a: 2,
      f: {y: 3, x: 3},
      d: {
        two: 4,
        one: 4,
      },
    });
  });
});
