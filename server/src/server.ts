import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import SpaceRepository from "../../database/src/space-repository.ts"

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
      const uuid = crypto.randomUUID()
      const space = {
        name: uuid,
      }
      await new SpaceRepository(this.#data).create(space)
      return c.json(space)
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
