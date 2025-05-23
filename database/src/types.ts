import type {
  ColumnType,
  Generated,
  Insertable,
  JSONColumnType,
  Kysely,
  Selectable,
  Updateable,
} from 'kysely'

export interface DatabaseTables {
  blob: BlobTable
  resource: ResourceTable
  resourceRepresentation: ResourceRepresentationTable
  space: SpaceTable
  spaceNamedResource: SpaceNamedResourceTable
}

export type Database = Kysely<DatabaseTables>

export interface SpaceTable {
  uuid: Generated<string>
  name: string | null
  controller: string | null
}

export interface IRepository<T> {
  getById(id: string): Promise<Selectable<T> | null>
  create(item: Insertable<T>): Promise<void>
  toArray(): Promise<Selectable<T>[]>
}

export interface ISpace {
  controller: string | null
  uuid: string
  name: string | null
}

// Resources

export interface ResourceTable {
  uuid: Generated<string>
  controller: string | null
}

export interface IResource {
  uuid: string
}

// Representation

export interface BlobTable {
  uuid: Generated<string>
  type: string
  bytes: Uint8Array
}

export interface ResourceRepresentationTable {
  resourceId: string
  representationId: string
  createdAt: Generated<Date>
}

// Space Names
// within a space. resources can be named

export interface SpaceNamedResourceTable {
  spaceId: string
  name: string
  resourceId: string
}
