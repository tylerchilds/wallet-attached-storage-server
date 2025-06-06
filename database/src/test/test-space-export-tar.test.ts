import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"
import SpaceRepository from '../space-repository.ts'
import ResourceRepository from '../resource-repository.ts'
import type { Database, ISpace } from '../types.ts'
import { collect } from 'streaming-iterables'
import { exportSpaceTar, readFilesFromTar } from '../space-tar.ts'

await test(`can export database as tar`, async t => {
  // setup database
  let database: Database
  {
    database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
    await initializeDatabaseSchema(database)
  }
  // create a space
  let createdSpace: ISpace
  {
    const spaceToCreate = {
      name: 'test-space',
      uuid: crypto.randomUUID(),
      controller: null,
      link: null,
    }
    await new SpaceRepository(database).create(spaceToCreate);
    createdSpace = spaceToCreate
  }
  // add resources to space
  const resourcesToAdd = Object.entries({
    'resource1': new Blob(['resource1 content'], { type: 'text/plain' }),
  })
  {
    for (const [name, representation] of resourcesToAdd) {
      await new ResourceRepository(database).putSpaceNamedResource({
        space: createdSpace.uuid,
        name,
        representation,
      })
    }
  }
  // export space as tar
  let exportedTarStream: ReadableStream
  {
    const exported = await exportSpaceTar(new ResourceRepository(database), createdSpace.uuid)
    assert.ok(exported, `result of exportSpaceAsTar must be truthy`)
    exportedTarStream = exported
  }
  // verify exported tar
  {
    const files = await collect(readFilesFromTar(exportedTarStream))
    assert.equal(files.length, resourcesToAdd.length,
      `expected ${resourcesToAdd.length} files in tar, got ${files.length}`)
    assert.ok(files.some(f => f.type === `text/plain`),
      `encoding/decoding preserves media type`)
  }
})
