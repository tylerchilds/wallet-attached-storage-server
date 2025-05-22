import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'
import SpaceRepository from "../../database/src/space-repository.ts"
import { GET as getSpacesIndex } from './routes/spaces._index.ts'
import { POST as postSpacesIndex } from './routes/spaces._index.ts'
import { GET as getSpaceByUuid } from './routes/space.$uuid.ts'
import { PUT as putSpaceByUuid } from './routes/space.$uuid.ts'
import ResourceRepository from "../../database/src/resource-repository.ts"
import { collect } from "streaming-iterables"
import { cors } from 'hono/cors'
import { authorizeWithSpace } from './lib/authz-middleware.ts'
import { z } from "zod"
import { SpaceResourceHono } from "./routes/space.$uuid.$name.ts"

interface IServerOptions {
  cors?: {
    origin?: (origin: string | undefined) => string | null
  },
  trustHeaderXForwardedProto?: boolean
}

/**
 * Hono instance encapsulating HTTP routing for Wallet Attached Storage Server
 */
export class ServerHono extends Hono {
  constructor(data: Database, options?: IServerOptions) {
    super()
    ServerHono.configureRoutes(this, data, options)
  }
  static configureRoutes(hono: Hono, data: Database, options?: IServerOptions) {
    const spaces = new SpaceRepository(data)
    const patternOfSpaceSlashName = /^(?<space>[^/]+)\/(?<name>.*)$/

    hono.use('*', cors({
      origin(origin, c) {
        return options?.cors?.origin?.(origin) ?? null
      },
    }))

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

    // GET /space/:uuid
    hono.get('/space/:uuid',
      authorizeWithSpace({ getSpace: async (c) => spaces.getById(c.req.param('uuid')) }),
      getSpaceByUuid(spaces))

    // PUT /space/:uuid
    hono.put('/space/:uuid',
      authorizeWithSpace({ getSpace: async (c) => spaces.getById(c.req.param('uuid')), }),
      putSpaceByUuid(spaces))

    // resources in a space
    // * /space/:space/:name{.*}
    hono.route('/space/:space/', new SpaceResourceHono({
      data,
      space: (c) => c.req.param('space'),
    }))

    // /space/:uuid/:resourceName{.*}
    //
    // Unfortunately, this group resourceName that may be the empty string
    // seems to break hono.
    // So we will parse it from /space/:spaceWithName{.+} instead
    {
      // PUT /space/:uuid/:resourceName{.*}
      // ^ errors from within hono when the resourceName pattern can be an empty string
      hono.put('/space/:spaceWithName{.+}',
        (c, next) => { // check if request is authorized to access the space
          const spaceWithName = c.req.param('spaceWithName')
          const spaceId = parseSpaceWithName(spaceWithName)?.space
          const getSpace = async () => {
            if (!spaceId) throw new Error(`unable to find space`, { cause: { spaceWithName, spaceId } })
            return spaces.getById(spaceId)
          }
          const authorization = authorizeWithSpace({ getSpace })
          return authorization(c, next)
        },
        async (c, next) => {
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

      /**
       * given :space/:name{.*} return {space,name}.
       * If no :space can be parsed, return undefined.
       */
      function parseSpaceWithName(spaceWithName: string) {
        const match = spaceWithName.match(patternOfSpaceSlashName)
        const space = match?.groups?.space
        const name = match?.groups?.name
        if (!(space)) {
          return
        }
        return { space, name }
      }
    }


  }
}

/**
 * Wallet Attached Storage Server that delegates to ServerHono
 */
export class Server implements Fetchable {
  #data: Database
  #hono: Hono
  constructor(
    data: Database,
    options?: IServerOptions
  ) {
    this.#data = data
    this.#hono = new ServerHono(this.#data, options)
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
