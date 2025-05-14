import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url, parseSqliteDatabaseUrl } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"

describe('CRUD Space', async () => {
  await test(`can create a space`, async t => {
    const database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
    await initializeDatabaseSchema(database)
    const result = await database.insertInto('space')
      .values({
        name: 'test-space',
      })
      .executeTakeFirstOrThrow()
  })
})
