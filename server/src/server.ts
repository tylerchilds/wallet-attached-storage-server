import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'
import { Hono } from 'hono'
import SpaceRepository from "../../database/src/space-repository.ts"
import { GET as getSpacesIndex } from './routes/spaces._index.ts'
import { POST as postSpacesIndex } from './routes/spaces._index.ts'
import { GET as getSpaceByUuid } from './routes/space.$uuid.ts'
import { PUT as putSpaceByUuid } from './routes/space.$uuid.ts'
import { cors } from 'hono/cors'
import { authorizeWithSpace } from './lib/authz-middleware.ts'
import { SpaceResourceHono } from "./routes/space.$uuid.$name.ts"
import { HTTPException } from "hono/http-exception"

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
      authorizeWithSpace({
        data,
        space: async (c) => spaces.getById(c.req.param('uuid'))
      }),
      getSpaceByUuid(spaces))

    // PUT /space/:uuid
    hono.put('/space/:uuid',
      authorizeWithSpace({
        data,
        space: async (c) => spaces.getById(c.req.param('uuid')),
        // this allows the initial PUT space request
        allowWhenSpaceNotFound: true,
      }),
      putSpaceByUuid(spaces))

    // resources in a space
    // * /space/:space/:name{.*}
    hono.route('/space/:space/', new SpaceResourceHono({
      data,
      space: (c) => c.req.param('space'),
    }))

    hono.onError(async (err, c) => {
      if (err instanceof HTTPException) {
        return c.json({
          message: err.message,
          status: err.status,
        }, err.status)
      }
      return c.json({
        status: 500,
        message: `Unexpected error`,
      }, 500)
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
