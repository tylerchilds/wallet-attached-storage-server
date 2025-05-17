import type { Insertable, QueryCreator, Updateable } from "kysely"
import type { DatabaseTables, IRepository, ISpace } from "./types"

export default class SpaceRepository implements IRepository<ISpace> {
  #database: QueryCreator<DatabaseTables>
  constructor(database: QueryCreator<DatabaseTables>) {
    this.#database = database
  }
  async getById(id: string) {
    const result = await this.#database.selectFrom('space')
      .selectAll()
      .where('uuid', '=', id)
      .executeTakeFirstOrThrow()
    return result
  }
  async create(space: Insertable<ISpace>) {
    try {
      await this.#database.insertInto('space')
        .values({
          controller: space.controller,
          uuid: space.uuid,
          name: space.name,
        })
        .executeTakeFirstOrThrow()
    } catch (error) {
      throw new Error(`Failed to create space`, {
        cause: error,
      })
    }
  }
  async put(space: Updateable<ISpace>) {
    const rowForSpace = {
      controller: space.controller,
      uuid: space.uuid,
      name: space.name,
    }
    try {
      await this.#database.insertInto('space')
        .values(rowForSpace)
        .onConflict(oc => {
          return oc.column('uuid').doUpdateSet(rowForSpace)
        })
        .executeTakeFirstOrThrow()
    } catch (error) {
      throw new Error(`Failed to create space`, {
        cause: error,
      })
    }
  }
  async toArray() {
    const spaces = await this.#database.selectFrom('space').selectAll().execute()
    return spaces
  }
}
