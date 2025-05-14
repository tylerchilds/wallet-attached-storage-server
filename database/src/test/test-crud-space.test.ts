import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"
import SpaceRepository from '../space-repository.ts'

describe('CRUD Space', async () => {
  await test(`can create a space then list it`, async t => {
    const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
    await initializeDatabaseSchema(database)

    // create a space
    await new SpaceRepository(database).create({
      name: 'test-space',
    });

    // list spaces
    const spaces = await new SpaceRepository(database).toArray()
    assert.equal(spaces.length, 1)
    assert.equal(spaces[0].name, 'test-space')

    // list spaces with transaction
    await database.transaction().execute(async (tx) => {
      const spaces = await new SpaceRepository(tx).toArray()
      assert.equal(spaces.length, 1)
      assert.equal(spaces[0].name, 'test-space')
    });
  });
})
