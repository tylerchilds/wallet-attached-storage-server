import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url, parseSqliteDatabaseUrl } from '../sqlite3/database-url-sqlite3.ts'

await describe('parseSqliteDatabaseUrl', async () => {
  await test(`can parse DATABASE_URL like sqlite3:/path/to/storage.sqlite3`, async t => {
    const databaseUrl = `sqlite3:/path/to/storage.sqlite3`
    const parsed = parseSqliteDatabaseUrl(databaseUrl)
    assert.equal(parsed.protocol, 'sqlite3:')
    assert.equal(parsed.pathname, '/path/to/storage.sqlite3')
  })

  await test(`can parse DATABASE_URL like sqlite3::memory:`, async (t) => {
    const parsed = parseSqliteDatabaseUrl(`sqlite3::memory:`)
    assert.equal(parsed.protocol, 'sqlite3:')
    assert.equal(parsed.pathname, ':memory:')
  })

  await test('errors when asked to parse a sqlite3 URL with relative path', async t => {
    const dbUrlWithRelativePath = 'sqlite3:../path/to/storage.sqlite3'
    assert.throws(() => {
      const parsed = parseSqliteDatabaseUrl(dbUrlWithRelativePath)
      console.debug('parsed', parsed)
    }, {
      message: 'sqlite3: path to database file must be an absolute path',
    })
  })

})

describe('createDatabaseFromSqlite3Url', async () => {
  await test(`DATABASE_URL like sqlite3::memory:`, async t => {
    const DATABASE_URL = `sqlite3::memory:`
    const database = createDatabaseFromSqlite3Url(DATABASE_URL)
  })
})
