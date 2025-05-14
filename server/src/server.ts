import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'
import SpaceRepository from "../../database/src/space-repository.ts"
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const CreateSpace = z.object({
  name: z.string(),
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
    hono.post('/spaces/', zValidator('json', CreateSpace), async c => {
      const createSpaceRequest = c.req.valid('json')
      await new SpaceRepository(this.#data).create(createSpaceRequest)
      return c.newResponse(null, 201)
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
