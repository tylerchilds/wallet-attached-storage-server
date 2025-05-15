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
  constructor(data: Database) {
    super()
    ServerHono.configureRoutes(this, data)
  }
  static configureRoutes(hono: Hono, data: Database) {
    const spaces = new SpaceRepository(data)

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

    const patternOfSpaceSlashName = /^(?<space>[^/]+)\/(?<name>.*)$/
    hono.get('/space/:spaceWithName{.+}', async (c,next) => {
      const spaceWithName = c.req.param('spaceWithName')
      const match = spaceWithName.match(patternOfSpaceSlashName)
      const space = match?.groups?.space
      const name = match?.groups?.name ?? ''
      if (!(space)) {
        return next()
      }
      const resources = new ResourceRepository(data)
      const representations = await collect(resources.iterateSpaceNamedRepresentations({
        space,
        name,
      }))
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
    hono.put('/space/:spaceWithName{.+}', async (c,next) => {
      const spaceWithName = c.req.param('spaceWithName')
      const match = spaceWithName.match(patternOfSpaceSlashName)
      const space = match?.groups?.space
      const name = match?.groups?.name
      if (!(space)) {
        return next()
      }
      const resources = new ResourceRepository(data)
      const representation = await c.req.blob()
      await resources.putSpaceNamedResource({
        space,
        name: name ?? '', 
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
