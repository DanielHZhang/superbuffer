import {Model, uint8, int16, uint16} from '../src/index';

describe('Special schema types', () => {
  type Player = {id: number; x: number; y: number};
  const playerModel = Model.fromSchemaDefinition<Player>('player', {
    id: uint8,
    x: {type: uint16, digits: 4},
    y: {type: int16, digits: 2},
  });
  const playerState: Player = {
    id: 0,
    x: 5.211427545,
    y: -12.00315,
  };

  it('Should truncate digits', () => {
    const buffer = playerModel.toBuffer(playerState);
    const data = playerModel.fromBuffer(buffer);
    expect(data.x).toBe(5.2114);
  });
});
