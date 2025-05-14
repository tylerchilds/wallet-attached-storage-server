import type { Insertable, QueryCreator } from "kysely"
import type { DatabaseTables, IRepository, ISpace } from "./types"

export default class SpaceRepository implements IRepository<ISpace> {
  #database: QueryCreator<DatabaseTables>
  constructor(database: QueryCreator<DatabaseTables>) {
    this.#database = database
  }
  async create(space: Insertable<ISpace>) {
    await this.#database.insertInto('space')
      .values({
        ...space,
      })
      .executeTakeFirstOrThrow()
  }
  async toArray() {
    const spaces = await this.#database.selectFrom('space').selectAll().execute()
    return spaces
  }
}
