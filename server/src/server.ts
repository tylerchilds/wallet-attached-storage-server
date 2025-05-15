import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'
import type { Context } from 'hono'
import SpaceRepository from "../../database/src/space-repository.ts"
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { CreateSpaceRequest } from "./api.zod.ts"
import { GET as getSpacesIndex } from './routes/spaces._index.ts'
import { POST as postSpacesIndex } from './routes/spaces._index.ts'
import { GET as getSpaceByUuid } from './routes/space.$uuid.ts'
import ResourceRepository from "../../database/src/resource-repository.ts"
import { collect } from "streaming-iterables"

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
    const spaces = new SpaceRepository(this.#data)

    hono.get('/', async c => {
      return Response.json({
        name: 'Wallet Attached Storage',
        spaces: 'spaces',
        type: [
          'SpaceRepository',
          'Service',
        ],
      })
    })

    // redirect GET /spaces -> /spaces/ with trailing slash
    hono.get('/spaces', async c => c.redirect('/spaces/'))

    hono.get('/spaces/', getSpacesIndex(spaces))
    hono.post('/spaces/', postSpacesIndex(spaces))
    hono.get('/space/:uuid', getSpaceByUuid(spaces))
    hono.get('/space/:space/:name{.+}', async c => {
      const space = c.req.param('space')
      const name = c.req.param('name')
      const resources = new ResourceRepository(this.#data)
      console.debug('querying for representations', {
        space,
        name,
      })
      const representations = await collect(resources.iterateSpaceNamedRepresentations({
        space,
        name,
      }))
      console.debug('representations', representations)
      if (representations.length === 0) {
        return c.notFound()
      }
      if (representations.length > 1) {
        console.warn('Multiple representations found for space name', {
          space,
          name,
        })
      }
      const [representation] = representations
      return c.newResponse(await representation.blob.bytes(), {
        headers: {
          "Content-Type": representation.blob.type,
        }
      })
    })
    hono.put('/space/:space/:name{.+}', async c => {
      const space = c.req.param('space')
      const name = c.req.param('name')
      const resources = new ResourceRepository(this.#data)
      const representation = await c.req.blob()
      await resources.putSpaceNamedResource({
        space,
        name,
        representation,
      })
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
