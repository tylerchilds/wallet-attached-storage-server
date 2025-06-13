import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"
import SpaceRepository from '../space-repository.ts'
import ResourceRepository from '../resource-repository.ts'
import { collect } from 'streaming-iterables'

describe('CRUD Space Named Resources', async () => {

  await test(`can create a space named resource and get it by name+space`, async t => {
    const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
    await initializeDatabaseSchema(database)

    const spaceToCreate = {
      name: 'test-space',
      uuid: crypto.randomUUID(),
    }

    // create a space
    await new SpaceRepository(database).create(spaceToCreate);

    // create a resource in the space
    const resourceRepo = new ResourceRepository(database)

    // // name the resource within the space
    const exampleName1 = `example-name-1-${crypto.randomUUID()}`
    const representation1 = new Blob(['foo'])
    await resourceRepo.putSpaceNamedResource({
      name: exampleName1,
      space: spaceToCreate.uuid,
      representation: representation1,
    })

    const representations = await collect(resourceRepo.iterateSpaceNamedRepresentations({
      space: spaceToCreate.uuid,
      name: exampleName1,
    }))
    assert.equal(representations.length, 1)
    const [representation] = representations
    assert.equal(representation.blob.type, representation1.type)
    assert.deepEqual(
      await representation.blob.arrayBuffer(),
      await representation1.arrayBuffer()
    );

    // try to delete the resource
    {
      await resourceRepo.deleteById(`urn:uuid:${spaceToCreate.uuid}/${exampleName1}`);
    }
  });
})

async function blobToDataURI(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  const base64String = btoa(binaryString);
  return `data:${blob.type};base64,${base64String}`;
}
