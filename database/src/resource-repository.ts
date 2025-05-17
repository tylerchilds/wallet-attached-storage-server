import type { Insertable, QueryCreator } from "kysely"
import type { DatabaseTables, IRepository, IResource } from "./types"
import { map } from "streaming-iterables"

export default class ResourceRepository implements IRepository<IResource> {
  #database: QueryCreator<DatabaseTables>
  constructor(database: QueryCreator<DatabaseTables>) {
    this.#database = database
  }
  async getById(id: string) {
    const result = await this.#database.selectFrom('resource')
      .selectAll()
      .where('uuid', '=', id)
      .executeTakeFirstOrThrow()
    return result
  }
  async getBySpaceName(space: string, name: string) {
    const result = await this.#database.selectFrom('spaceNamedResource')
      // .innerJoin('resource', 'spaceNamedResource.resourceId', 'resource.uuid')
      .where('spaceId', '=', space)
      .where('name', '=', name)
      .selectAll()
      .executeTakeFirstOrThrow()
    const namedResource = {
      uuid: result.resourceId,
      name: {
        space: result.spaceId,
        name: result.name,
      },
    }
    return namedResource
  }
  async * iterateSpaceNamedRepresentations(query: {
    space: string,
    name: string,
  }) {
    const resultOfSelectRepresentations = await this.#database.selectFrom('resourceRepresentation')
      .innerJoin('spaceNamedResource', 'spaceNamedResource.resourceId', 'resourceRepresentation.resourceId')
      .innerJoin('blob', 'blob.uuid', 'resourceRepresentation.representationId')
      .select([
        'blob.bytes',
        'blob.type',
        'resourceRepresentation.createdAt',
        'spaceNamedResource.name',
        'spaceNamedResource.spaceId as space',
      ])
      .where('spaceNamedResource.spaceId', '=', query.space)
      .where('spaceNamedResource.name', '=', query.name)
      .orderBy('resourceRepresentation.createdAt', 'desc')
      .execute()
    yield* map(
      x => ({
        blob: new Blob([x.bytes], {type:x.type}),
        createdAt: x.createdAt,
      }),
      resultOfSelectRepresentations)
  }
  async create(input: Insertable<IResource> & { representation?: Blob }) {
    try {
      await this.#database.insertInto('resource')
        .values({
          ...input,
        })
        .executeTakeFirstOrThrow()
    } catch (error) {
      throw new Error(`Failed to create`, {
        cause: error,
      })
    }
  }
  async putSpaceNamedResource(input: {
    space: string,
    name: string,
    representation: Blob,
  }) {
    const blobToInsert = {
      uuid: crypto.randomUUID(),
      type: input.representation.type,
      bytes: await input.representation.bytes(),
    }
    // insert blob
    await this.#database.insertInto('blob')
      .values(blobToInsert)
      .executeTakeFirstOrThrow()

    // insert resource
    const resourceToInsert = {
      uuid: crypto.randomUUID()
    }
    await this.#database.insertInto('resource')
      .values(resourceToInsert)
      .executeTakeFirstOrThrow()

    // insert resource representation
    await this.#database.insertInto('resourceRepresentation')
      .values({
        resourceId: resourceToInsert.uuid,
        representationId: blobToInsert.uuid,
      })
      .executeTakeFirstOrThrow()

    // bind space name to resource
    await this.#database.insertInto('spaceNamedResource')
      .values({
        spaceId: input.space,
        name: input.name,
        resourceId: resourceToInsert.uuid,
      })
      .executeTakeFirstOrThrow()
  }
  async toArray() {
    const spaces = await this.#database.selectFrom('resource').selectAll().execute()
    return spaces
  }
}
