import type { Context, Next } from "hono"
import type SpaceRepository from "../../../database/src/space-repository.ts"
import { HTTPException } from 'hono/http-exception'
import { PutSpaceRequestBodyShape } from "../shapes/PutSpaceRequestBody.ts"
import Negotiator from "negotiator"
import { exportSpaceTar } from "wallet-attached-storage-database/space-tar"
import ResourceRepository from "wallet-attached-storage-database/resource-repository"
import { stream } from 'hono/streaming'

function toNodeHeaders(headers: Headers) {
  const nodeHeaders: Record<string, string[] | string> = {}
  for (const [key, value] of headers.entries()) {
    const normalizedKey = key.toLowerCase()
    const prev = nodeHeaders[normalizedKey]
    nodeHeaders[normalizedKey] = Array.isArray(prev) ? [...prev, value] : prev ? [prev, value] : value
  }
  return nodeHeaders
}

function negotiate(headers: Headers, supportedMediaTypes: string[]) {
  const negotiator = new Negotiator({ headers: toNodeHeaders(headers) })
  return negotiator.mediaType(supportedMediaTypes)
}

/**
 * build a route to get a space by uuid from a space repository
 * @param spaces - the space repository to query
 * @returns - hono handler
 */
export function GET(o: {
  spaces: Pick<SpaceRepository, 'getById'>,
  resources: ResourceRepository,
}) {
  // hono request handler
  // @example (new Hono).get('/spaces/:uuid', GET(spaces))
  return async (c: Context<any, '/:uuid'>) => {
    const uuid = c.req.param('uuid')
    const space = await o.spaces.getById(uuid)
    if (!space) {
      // space does not exist
      // return 401. same as if space does exist but request includes insufficient authorization
      return c.newResponse(null, 401)
    }
    const contentType = negotiate(c.req.raw.headers, ['application/json', 'application/x-tar'])
    switch (contentType) {
      case `application/x-tar`: {
        // export space as tar
        const spaceTar = await exportSpaceTar(o.resources, uuid)
        return new Response(spaceTar, {
          headers: {
            'Content-Type': 'application/x-tar',
            'Content-Disposition': `attachment; filename="space.${uuid}.tar"`,
          },
        })
        break;
      }
      // fall through for default which is application/json
    }
    return c.json(space, 200)
  }
}

/**
 * build a route to PUT/update a space by uuid from a space repository
 * @param spaces - the space repository to query
 * @returns - hono handler
 */
export function PUT(
  spaces: Pick<SpaceRepository, 'getById' | 'create' | 'put'>,
) {
  // hono request handler
  // use like
  //   (new Hono).get('/spaces/:uuid', GET(spaces))
  return async (c: Context<any, '/:uuid'>) => {
    const uuid = c.req.param('uuid')
    const requestBodyObject = await c.req.json()
    const parsedPutSpaceRequest = PutSpaceRequestBodyShape.safeParse(requestBodyObject)
    if (parsedPutSpaceRequest.error) {
      throw new HTTPException(400, {
        message: `Invalid request body for PUT /spaces/${uuid}`,
        cause: parsedPutSpaceRequest.error,
      })
    }
    const spaceToCreate = {
      ...parsedPutSpaceRequest.data,
      uuid,
    }
    await spaces.put(spaceToCreate)
    return c.newResponse(null, 204)
  }
}

/**
 * build a route to delete a space by uuid from a space repository
 * @param spaces - the space repository to query
 * @returns - hono handler
 */
export function DELETE(
  spaces: Pick<SpaceRepository, 'deleteById'>,
) {
  // hono request handler
  // use like
  //   (new Hono).get('/spaces/:uuid', GET(spaces))
  return async (c: Context<any, '/:uuid'>) => {
    const uuid = c.req.param('uuid')
    await spaces.deleteById(uuid)
    return c.newResponse(null, 204)
  }
}
