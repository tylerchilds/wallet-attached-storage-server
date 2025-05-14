import type { Context } from "hono"
import type SpaceRepository from "../../../database/src/space-repository.ts"

export function GET(spaces: SpaceRepository) {
  return async (c: Context<any, '/:uuid'>) => {
    const uuid = c.req.param('uuid')
    const space = await spaces.getById(uuid)
    if (!space) {
      return c.notFound()
    }
    return c.json(space)
  }
}
