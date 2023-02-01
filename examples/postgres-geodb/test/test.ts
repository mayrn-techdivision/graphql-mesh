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
    mesh = await getMesh(config);
  });
  it('should give correct response for example queries', async () => {
    const result = await mesh.execute(config.documents[0].document!, {});
    if (result.errors?.length) {
      throw result.errors[0];
    }
    expect(result).toMatchObject({
      data: {
        allCities: {
          nodes: [
            {
              countrycode: expect.any(String),
              developers: [
                {
                  login: expect.any(String),
                },
              ],
            },
          ],
        },
      },
    });
  });
  afterAll(() => {
    mesh?.destroy();
  });
});
