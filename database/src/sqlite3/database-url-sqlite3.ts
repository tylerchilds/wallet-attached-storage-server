import Sqlite3Database from "better-sqlite3"
import { Kysely, SqliteDialect } from "kysely"
import type { Database } from "../types"

export function parseSqliteDatabaseUrl(dburl: string) {
  const url = new URL(dburl)
  const protocol = url.protocol
  const pathname = url.pathname
  const isMemory = pathname === ':memory:'
  const pathnameIsRelative = pathname.startsWith('.')
  if (!isMemory && pathnameIsRelative) {
    throw new Error('sqlite3: path to database file must be an absolute path')
  }
  return {
    protocol,
    pathname,
  }
}

export function createDatabaseFromSqlite3Url(dburl: string): Database {
  const { protocol, pathname } = parseSqliteDatabaseUrl(dburl)
  const database: Database = new Kysely({
    dialect: new SqliteDialect({
      database: new Sqlite3Database(pathname),
    })
  })
  return database
}
