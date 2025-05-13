import { Kysely, SqliteDialect } from 'kysely'
import { serve } from '@hono/node-server'
import { Sqlite3Database } from 'better-sqlite3'
import type { Database } from 'wallet-attached-storage-database/types'
import WAS from 'wallet-attached-storage-server'

// store data in-memory
const data: Database = new Kysely({
  dialect: new SqliteDialect({
    database() {
      return new Sqlite3Database(':memory')
    }
  })
})

const { fetch } = new WAS.Server(data)
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0
const server = serve({
  fetch,
  port
}, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
