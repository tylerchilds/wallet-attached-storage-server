import { Hono } from "hono";
import type { Context, Env, Schema } from "hono";
import type { Database } from "wallet-attached-storage-database/types";
import ResourceRepository from "wallet-attached-storage-database/resource-repository";
import { collect } from "streaming-iterables";
import { authorizeWithSpace } from "../lib/authz-middleware.ts";
import { z } from "zod"
import SpaceRepository from "wallet-attached-storage-database/space-repository";
import { createFactory } from 'hono/factory'

interface ISpaceResourceHonoOptions<P extends string> {
  space: (c: Context<Env, P>) => string | undefined,
  data: Database,
}

export class SpaceResourceHono<E extends Env, P extends string> extends Hono<E> {
  constructor(options: ISpaceResourceHonoOptions<P>) {
    super()
    this.configureRoutes(this, options)
  }
  configureRoutes = configureRoutes
}

/**
 * configure a hono to add space resource routes
 */
function configureRoutes<E extends Env, P extends string>(
  hono: Hono<E>,
  options: ISpaceResourceHonoOptions<P>
) {
  hono.on('get', ['', ':name{.+}'], ...GET(options))
  hono.on('put', ['', ':name{.+}'], ...PUT(options))
}

const factory = createFactory<Env, `/space/:space/:name`>()

export const GET = <P extends string>(options: ISpaceResourceHonoOptions<P>) => {
  const resources = new ResourceRepository(options.data)
  const spaces = new SpaceRepository(options.data)
  const handleGet = factory.createHandlers(
    async (c, next) => {
      const spaceWithName = c.req.param('spaceWithName')
      const spaceId = options.space(c)
      if (!spaceId) return next()
      const resources = new ResourceRepository(options.data)

      // look up the space index
      const spaceIndex = await collect(resources.iterateSpaceNamedRepresentations({
        space: spaceId,
        name: '',
      }))

      const spaceIndexLd = spaceIndex.find(r => r.blob.type === 'application/ld+json')
      const spaceIndexLdObject = spaceIndexLd && JSON.parse(await spaceIndexLd.blob.text())
      const indexAclValue = spaceIndexLdObject?.['http://www.w3.org/ns/auth/acl#acl']

      const spaceAclResource = (await resources.iterateSpaceNamedRepresentations({
        space: spaceId,
        name: indexAclValue,
      }).next())?.value
      const spaceAclObject = spaceAclResource && JSON.parse(await spaceAclResource.blob.text())
      const shapeOfSpaceAcl = z.object({
        authorization: z.array(z.object({
          agentClass: z.string(),
          accessTo: z.array(z.string()),
          mode: z.array(z.string()),
        }))
      })
      const spaceAcl = spaceAclObject ? shapeOfSpaceAcl.parse(spaceAclObject) : undefined
      console.debug('spaceAcl.authorization', spaceAcl?.authorization)
      let authorizedViaAcl = false

      // check if the request is authorized via the space acl
      {
        // we want to find authorizations relevant to this request
        function* matchRequestToAuthorizations(acl: z.TypeOf<typeof shapeOfSpaceAcl>, request: { path: string, method: string }) {
          for (const authz of acl.authorization) {

            let accessToMatches = false
            if (authz.accessTo.includes(request.path)) {
              accessToMatches = true
            }

            let agentMatches = false
            if (authz.agentClass === 'http://xmlns.com/foaf/0.1/Agent') {
              // this is in docs as 'Allows access to any agent, i.e., the public.'
              agentMatches = true
            }

            let modeMatches = false
            let authzModeIsRead = false
            if (authz.mode.includes('Read')) authzModeIsRead = true
            if (authzModeIsRead && request.method === 'GET') modeMatches = true

            if ([accessToMatches, agentMatches, modeMatches].every(Boolean)) {
              yield authz
            }
          }
        }
        const relevantAuthorizations = spaceAcl
          ? Array.from(matchRequestToAuthorizations(spaceAcl, {
            path: new URL(c.req.raw.url).pathname,
            method: c.req.method,
          }))
          : []
        console.debug('relevantAuthorizations', relevantAuthorizations)
        if (relevantAuthorizations.length > 0) {
          authorizedViaAcl = true
        }
      }

      if (authorizedViaAcl) {
        return next()
      }

      return authorizeWithSpace({
        getSpace: async (c) => {
          if (!spaceId) throw new Error(`unable to find space`, { cause: { spaceWithName, spaceId } })
          return spaces.getById(spaceId)
        }
      })(c, next)
    },
    async (c, next) => {
      const space = await options.space(c)
      if (!(space)) {
        return next()
      }
      const name = c.req.param('name') ?? ''
      const representations = await collect(resources.iterateSpaceNamedRepresentations({
        space,
        name,
      }))
      console.debug('representations', representations, { space, name })
      if (representations.length === 0) {
        return c.notFound()
      }
      if (representations.length > 1) {
        console.warn(`found multiple representations for GET /space/${space}/${name}`, representations)
      }
      const [representation] = representations
      return c.newResponse(await representation.blob.bytes(), {
        headers: {
          "Content-Type": representation.blob.type,
        }
      })
    }
  )
  return handleGet
}

export const PUT = <P extends string>(options: ISpaceResourceHonoOptions<P>) => {
  const handlePut = factory.createHandlers(
    (c, next) => { // check if request is authorized to access the space
      const spaceId = options.space(c)
      const spaces = new SpaceRepository(options.data)
      const getSpace = async () => {
        if (!spaceId) throw new Error(`unable to find space`, { cause: { spaceId } })
        return spaces.getById(spaceId)
      }
      const authorization = authorizeWithSpace({ getSpace })
      return authorization(c, next)
    },
    async (c, next) => {
      const spaceWithName = c.req.param('spaceWithName')
      const space = options.space(c)
      const name = c.req.param('name') ?? '';
      if (!(space)) {
        return next()
      }
      const representation = await c.req.blob()
      const resources = new ResourceRepository(options.data)
      await resources.putSpaceNamedResource({
        space,
        name: name ?? '',
        representation,
      })
      return c.newResponse(null, 201)
    });
  return handlePut
}