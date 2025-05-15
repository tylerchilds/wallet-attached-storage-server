import { sql, type Kysely } from 'kysely'

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function up(db: Kysely<any>): Promise<void> {
	// up migration code goes here...
	// note: up migrations are mandatory. you must implement this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.createTable('resource')
		.ifNotExists()
		.addColumn('uuid', 'uuid', (col) => col.primaryKey())
		.execute()
	await db.schema
		.createTable('blob')
		.ifNotExists()
		.addColumn('uuid', 'text', (col) => col.primaryKey())
		.addColumn('type', 'text')
		.addColumn('bytes', 'blob', col => col.notNull())
		.execute()
	await db.schema
		.createTable('resourceRepresentation')
		.ifNotExists()
		.addColumn('representationId', 'text')
		.addColumn('resourceId', 'uuid', (col) => col.references('resource.uuid'))
		.addColumn('createdAt', 'timestamp',
			col => col
				.notNull()
				// this will work in sqlite3 but probably not postgres
				.defaultTo(sql`CURRENT_TIMESTAMP`)
		)
		.execute()
	await db.schema
		.createTable('spaceNamedResource')
		.ifNotExists()
		.addColumn('spaceId', 'uuid', col => col.notNull())
		.addColumn('name', 'text')
		.addColumn('resourceId', 'uuid', (col) => col.references('resource.uuid'))
		.execute()
}

// `any` is required here since migrations should be frozen in time. alternatively, keep a "snapshot" db interface.
export async function down(db: Kysely<any>): Promise<void> {
	// down migration code goes here...
	// note: down migrations are optional. you can safely delete this function.
	// For more info, see: https://kysely.dev/docs/migrations
	await db.schema
		.dropTable('space')
		.execute()
}
