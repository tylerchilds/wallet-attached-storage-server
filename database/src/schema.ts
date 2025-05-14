import { Kysely } from "kysely";

export function initializeDatabaseSchema<Database>(database: Kysely<Database>) {
  return database.schema
    .createTable('space')
    .addColumn('id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'text')
    .addColumn('controller', 'text')
    .execute()
}
