import { Kysely, sql } from "kysely";

export async function initializeDatabaseSchema<Database>(database: Kysely<Database>) {
  await database.schema
    .createTable('space')
    .ifNotExists()
    .addColumn('uuid', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('name', 'text')
    .addColumn('controller', 'text')
    .execute()
  await database.schema
    .createTable('resource')
    .ifNotExists()
    .addColumn('uuid', 'uuid', (col) => col.primaryKey())
    .execute()
  await database.schema
    .createTable('blob')
    .ifNotExists()
    .addColumn('uuid', 'text', (col) => col.primaryKey())
    .addColumn('type', 'text')
    .addColumn('bytes', 'blob', col => col.notNull())
    .execute()
  await database.schema
    .createTable('resourceRepresentation')
    .ifNotExists()
    .addColumn('representationId', 'text')
    .addColumn('resourceId', 'uuid', (col) => col.references('resource.uuid'))
    .addColumn('createdAt', 'timestamp',
      col => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()
  await database.schema
    .createTable('spaceNamedResource')
    .ifNotExists()
    .addColumn('spaceId', 'uuid', col => col.notNull())
    .addColumn('name', 'text')
    .addColumn('resourceId', 'uuid', (col) => col.references('resource.uuid'))
    .execute()
}
