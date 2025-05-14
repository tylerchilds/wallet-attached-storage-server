import { Kysely } from "kysely";

export function initializeDatabaseSchema<Database>(database: Kysely<Database>) {
  return database.schema
    .createTable('space')
    .ifNotExists()
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('name', 'text')
    .addColumn('controller', 'text')
    .execute()
}
