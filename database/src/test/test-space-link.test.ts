import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"
import SpaceRepository from '../space-repository.ts'

describe('Space link', async () => {
  // SpaceRepository#create
  {
    await test(`can create a space with link`, async t => {
      const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
      await initializeDatabaseSchema(database)

      const spaceUuid = crypto.randomUUID()
      const spaceToCreate = {
        name: 'test-space',
        uuid: spaceUuid,
        link: `/space/${spaceUuid}/links/`,
      }

      // create a space
      await new SpaceRepository(database).create(spaceToCreate);

      // get space by id
      const gotSpaceById = await new SpaceRepository(database).getById(spaceUuid)
      assert.equal(gotSpaceById.link, spaceToCreate.link)
      assert.equal(gotSpaceById.uuid, spaceToCreate.uuid)
    });

    await test(`can create a space without link`, async t => {
      const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
      await initializeDatabaseSchema(database)

      const spaceUuid = crypto.randomUUID()
      const spaceToCreate = {
        name: 'test-space',
        uuid: spaceUuid,
      }

      // create a space
      await new SpaceRepository(database).create(spaceToCreate);

      // get space by id
      const gotSpaceById = await new SpaceRepository(database).getById(spaceUuid)
      assert.equal(gotSpaceById.link, null)
      assert.equal(gotSpaceById.uuid, spaceToCreate.uuid)
    });
  }

  // SpaceRepository#put
  {
    await test(`can put a space with link`, async t => {
      const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
      await initializeDatabaseSchema(database)

      const spaceUuid = crypto.randomUUID()
      const spaceToCreate = {
        name: 'test-space',
        uuid: spaceUuid,
        link: `/space/${spaceUuid}/links/`,
      }

      // put a space
      await new SpaceRepository(database).put(spaceToCreate);

      // get space by id
      const gotSpaceById = await new SpaceRepository(database).getById(spaceUuid)
      assert.equal(gotSpaceById.link, spaceToCreate.link)
      assert.equal(gotSpaceById.uuid, spaceToCreate.uuid)
    });

    await test(`can put a space without link`, async t => {
      const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
      await initializeDatabaseSchema(database)

      const spaceUuid = crypto.randomUUID()
      const spaceToCreate = {
        name: 'test-space',
        uuid: spaceUuid,
      }

      // put a space
      await new SpaceRepository(database).put(spaceToCreate);

      // get space by id
      const gotSpaceById = await new SpaceRepository(database).getById(spaceUuid)
      assert.equal(gotSpaceById.link, null)
      assert.equal(gotSpaceById.uuid, spaceToCreate.uuid)
    });
  }
})
