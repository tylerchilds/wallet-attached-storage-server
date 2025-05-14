import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'
import SpaceRepository from "../../database/src/space-repository.ts"
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const CreateSpace = z.object({
  name: z.string().or(z.null()).optional(),
  uuid: z.string(),
})

/**
 * Hono instance encapsulating HTTP routing for Wallet Attached Storage Server
 */
export class ServerHono extends Hono {
  #data: Database
  constructor(data: Database) {
    super()
    this.#data = data
    this.#configureRoutes(this)
  }
  #configureRoutes(hono: Hono) {
    hono.get('/', async c => {
      return Response.json({ message: 'Hello from the Wallet Attached Storage Server!' })
    })
    hono.get('/spaces/', async c => {
      const spacesArray = await new SpaceRepository(this.#data).toArray()
      return c.json({
        items: spacesArray,
      })
    })
    hono.post('/spaces/', async c => {
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

      const createSpaceRequest = CreateSpace.parse(requestBodyObject)
      const created = await new SpaceRepository(this.#data).create(createSpaceRequest)
      const pathnameOfSpace = `/space/${createSpaceRequest.uuid}`
      return c.newResponse(null, 201, {
        'Location': pathnameOfSpace,
      })
    })
  }
}

/**
 * Wallet Attached Storage Server that delegates to ServerHono
 */
export class Server implements Fetchable {
  #data: Database
  #hono: Hono
  constructor(
    data: Database
  ) {
    this.#data = data
    this.#hono = new ServerHono(this.#data)
  }
  fetch = async (request: Request) => {
    try {
      const response = await this.#hono.fetch(request, {})
      return response
    } catch (error) {
      console.error('error', error)
      throw error
    }
  }
}
