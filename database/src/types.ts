import type {
  ColumnType,
  Generated,
  Insertable,
  JSONColumnType,
  Kysely,
  Selectable,
  Updateable,
} from 'kysely'
import type { Nullable } from 'kysely'

export interface DatabaseTables {
  blob: BlobTable
  link: LinkTable
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
  /** uri reference to link(s) related to space */
  link: string | null
  name: string | null
  uuid: string
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

// Link

export interface LinkTable {
  uuid: string
  anchor: string
  rel: string | null
  href: string
  linkset: Nullable<JSONColumnType<Linkset>>
  createdAt: Generated<Date>
}

interface Linkset<Rel extends string = string> {
  linkset: Array<LinkContext<Rel>>
}

type LinkContext<Rel extends string=string> = 
  & { anchor: string }
  & Record<Rel, LinkTarget[]>

interface LinkTarget {
  href: string
  // other target attributes
  [key: string]: string | Array<string|object>
}

export type ILink = Selectable<LinkTable>
