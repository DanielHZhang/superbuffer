import {Model, uint8, int16, uint16} from '../src/index';

describe('get schema id test', () => {
  const model = Model.fromSchemaDefinition('mySchema', {
    id: uint8,
    x: {type: uint16, digits: 4},
  });
  const state = {id: 0, x: 1.2345};
  const buffer = model.toBuffer(state);

  test('should get the same ids', () => {
    const bufferId = Model.getIdFromBuffer(buffer);
    const schemaId = model.schema.id;
    const modelId = model.id;

    expect(bufferId).toBe(schemaId);
    expect(schemaId).toBe(modelId);
  });
});
