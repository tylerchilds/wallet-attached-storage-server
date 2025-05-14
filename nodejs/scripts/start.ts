import { Kysely, SqliteDialect } from 'kysely'
import { serve } from '@hono/node-server'
import Sqlite3Database from 'better-sqlite3'
import type { Database } from 'wallet-attached-storage-database/types'
import { createDatabaseFromSqlite3Url } from 'wallet-attached-storage-database/sqlite3'
import WAS from 'wallet-attached-storage-server'
import { initializeDatabaseSchema } from '../../database/src/schema.ts'

// store data in-memory
const data = createDatabaseFromEnv({
  DATABASE_URL: process.env.DATABASE_URL,
})
await initializeDatabaseSchema(data)

const { fetch } = new WAS.Server(data)
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0
const server = serve({
  fetch,
  port
}, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})

/**
 * given environment variables, create a suitable Database.
 * Use env.DATABASE_URL if provided, otherwise create an in-memory database.
 */
function createDatabaseFromEnv(env: {
  DATABASE_URL?: unknown
}) {
  if (env.DATABASE_URL) {
    const database = createDatabaseFromSqlite3Url(env.DATABASE_URL?.toString())
    if (database) {
      return database
    }
  }
  // if no DATABASE_URL is provided, create an in-memory database
  return createInMemoryDatabase()
}

function createInMemoryDatabase() {
  const data: Database = new Kysely({
    dialect: new SqliteDialect({
      database() {
        return new Sqlite3Database(':memory')
      }
    })
  })
  return data
}
