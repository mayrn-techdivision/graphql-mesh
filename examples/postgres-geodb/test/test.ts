import { join } from 'path';
import { findAndParseConfig } from '@graphql-mesh/cli';
import { ProcessedConfig } from '@graphql-mesh/config';
import { getMesh, MeshInstance } from '@graphql-mesh/runtime';

jest.setTimeout(30000);

let config: ProcessedConfig;
let mesh: MeshInstance;

describe('PostgresGeoDB', () => {
  beforeAll(async () => {
    config = await findAndParseConfig({
      dir: join(__dirname, '..'),
    });
    process.env.DEBUG = '1';
    mesh = await getMesh(config);
    process.env.DEBUG = undefined;
  });
  it('should give correct response for example queries', async () => {
    const result = await mesh.execute(config.documents[0].document!, {});
    expect(result?.data?.allCities?.nodes?.[0]?.countrycode).toBeTruthy();
    expect(result?.data?.allCities?.nodes?.[0]?.developers?.[0]?.login).toBeTruthy();
  });
  afterAll(() => {
    mesh.destroy();
  });
});
