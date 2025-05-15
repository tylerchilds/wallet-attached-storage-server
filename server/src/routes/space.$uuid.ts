import type { Context } from "hono"
import type SpaceRepository from "../../../database/src/space-repository.ts"

/**
 * build a route to get a space by uuid from a space repository
 * @param spaces - the space repository to query
 * @returns - hono handler
 */
export function GET(
  spaces: Pick<SpaceRepository, 'getById'>,
) {
  // hono request handler
  // use like
  //   (new Hono).get('/spaces/:uuid', GET(spaces))
  return async (c: Context<any, '/:uuid'>) => {
    const uuid = c.req.param('uuid')
    const space = await spaces.getById(uuid)
    if (!space) {
      return c.notFound()
    }
    return c.json(space)
  }
}
