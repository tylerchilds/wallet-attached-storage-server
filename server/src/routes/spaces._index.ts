import type { Context, Next } from 'hono'
import SpaceRepository from '../../../database/src/space-repository.ts'
import { CreateSpaceRequest } from '../api.zod.ts'
import { z } from 'zod'

export const GET = (repo: SpaceRepository) => async (c: Context, next: Next) => {
  const spacesArray = await repo.toArray()
  return c.json({
    items: spacesArray,
  })
}

export const POST = (repo: SpaceRepository) => async (c: Context, next: Next) => {
  // request body is optional
  const bodyText = await c.req.text().then(t => t.trim())
  let requestBodyObject
  if ( ! bodyText) {
    // no request body, no requestBodyObject
    requestBodyObject = {
      uuid: crypto.randomUUID(),
    }
  } else {
    requestBodyObject = JSON.parse(bodyText)
  }

  const authorization = c.req.raw.headers.get('authorization')
  // console.debug('POST /spaces/ authorization', authorization)

  let createSpaceRequest: z.TypeOf<typeof CreateSpaceRequest>
  try {
    createSpaceRequest = CreateSpaceRequest.parse(requestBodyObject)
  } catch (error) {
    console.warn('error parsing request body', error)
    return c.json(error, 400)
  }
  const created = await repo.create(createSpaceRequest)
  const pathnameOfSpace = `/space/${createSpaceRequest.uuid}`
  return c.newResponse(null, 201, {
    'Location': pathnameOfSpace,
  })
}
