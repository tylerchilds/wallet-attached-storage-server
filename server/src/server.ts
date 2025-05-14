import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'

/**
 * Hono instance encapsulating HTTP routing for Wallet Attached Storage Server
 */
export class ServerHono extends Hono {
  constructor() {
    super()
    this.#configureRoutes(this)
  }
  #configureRoutes(hono: Hono) {
    hono.get('/', async c => {
      return Response.json({ message: 'Hello from the Wallet Attached Storage Server!' })
    })
  }
}

/**
 * Wallet Attached Storage Server that delegates to ServerHono
 */
export class Server implements Fetchable {
  #data: Database
  constructor(
    data: Database
  ) {
    this.#data = data
  }
  async fetch(request: Request) {
    return new ServerHono().fetch(request)
  }
}
