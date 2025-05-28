import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"
import SpaceRepository from '../space-repository.ts'

describe('CRUD Space', async () => {
  await test(`can create a space then list it`, async t => {
    const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
    await initializeDatabaseSchema(database)

    const spaceToCreate = {
      name: 'test-space',
      uuid: crypto.randomUUID(),
    }

    // create a space
    await new SpaceRepository(database).create(spaceToCreate);

    // list spaces
    const spaces = await new SpaceRepository(database).toArray()
    assert.equal(spaces.length, 1)
    assert.equal(spaces[0].name, 'test-space')
    const [space] = spaces
    assert.equal(space.name, spaceToCreate.name)
    assert.equal(space.uuid, spaceToCreate.uuid)

    // list spaces with transaction
    await database.transaction().execute(async (tx) => {
      const spaces = await new SpaceRepository(tx).toArray()
      assert.equal(spaces.length, 1)
      const [space] = spaces
      assert.equal(space.name, spaceToCreate.name)
      assert.equal(space.uuid, spaceToCreate.uuid)
    });

    // get by id
    const gotById1 = await new SpaceRepository(database).getById(space.uuid);
    assert.ok(gotById1)

    // delete space
    await new SpaceRepository(database).deleteById(space.uuid);

    // after delete, get by id -> SpaceNotFound
    const gotById2 = new SpaceRepository(database).getById(space.uuid);
    assert.rejects(gotById2, 'SpaceNotFound')
  });
})
