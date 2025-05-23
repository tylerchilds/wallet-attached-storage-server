import { Hono } from "hono";
import type { Context, Env, Schema } from "hono";
import type { Database } from "wallet-attached-storage-database/types";
import ResourceRepository from "wallet-attached-storage-database/resource-repository";
import { collect } from "streaming-iterables";
import { authorizeWithSpace } from "../lib/authz-middleware.ts";
import { z } from "zod"
import SpaceRepository, { SpaceNotFound } from "wallet-attached-storage-database/space-repository";
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
  // use .on and multiple paths templates because route /:space/:name{.*} doesn't work with hono
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

      // look up the space object
      let spaceObject
      try {
        spaceObject = await spaces.getById(spaceId)
      } catch (error) {
        if (error instanceof SpaceNotFound) {
          console.debug('space not found', spaceId)
          return next()
        }
        console.debug('unexpected error looking up space', error)
        throw error
      }

      // we are going to determine the link to the space acl, if there is one
      let spaceAclResourceSelector: { space: string, name: string } | undefined

      console.debug('spaceObject', spaceObject)
      if (spaceObject.link) {
        console.debug('spaceObject.link', spaceObject.link)
        // determine if the link is of a known type
        function parseSpaceLink(link: string) {
          const patternOfSpacePath = /\/space\/(?<space>[^/]+)\/(?<name>.*)/
          const match = link.match(patternOfSpacePath)
          if (match) {
            return {
              space: match.groups?.space!,
              name: match.groups?.name!,
            }
          }
        }
        const parsedLink = parseSpaceLink(spaceObject.link)
        if (!parsedLink) {
          console.warn('unexpected Space#link value. skipping it', spaceObject.link)
        } else {
          // We parsed the space link to a space resource.
          // Let's look up representations of that as a linkset.
          let linksetJsonRepresentation
          console.debug('looking for representations of', parsedLink)
          for await (const repr of resources.iterateSpaceNamedRepresentations(parsedLink)) {
            if (repr.blob.type === 'application/linkset+json') {
              linksetJsonRepresentation = repr
              break
            }
          }

          console.debug('linksetJsonRepresentation', linksetJsonRepresentation)
          if (linksetJsonRepresentation) {
            async function parseLinksetJsonBlob(blob: Blob) {
              const text = await blob.text()
              const object = JSON.parse(text)
              return parseLinksetJsonFromObject(object)
            }
            const shapeOfLinkset = z.object({
              linkset: z.array(
                z.object({
                  anchor: z.string(),
                  acl: z.array(z.object({
                    href: z.string(),
                  })).optional(),
                }),
                z.object({
                  anchor: z.string(),
                }),

              )
            })
            type LinksetFromZod = z.TypeOf<typeof shapeOfLinkset>
            function parseLinksetJsonFromObject(object: unknown) {

              const parsedLinkset = shapeOfLinkset.parse(object)
              return parsedLinkset
            }
            const linkset = await parseLinksetJsonBlob(linksetJsonRepresentation.blob)
            function* iterateAclLinkTargets(linkset: LinksetFromZod) {
              for (const ctx of linkset.linkset) {
                for (const target of ctx.acl ?? []) {
                  yield target
                }
              }
            }
            console.debug('linkset', linkset)
            const aclLinkTarget = iterateAclLinkTargets(linkset).next().value
            console.debug('aclLinkTarget', aclLinkTarget)
            if (aclLinkTarget) {
              const parsedAclLinkTargetHref = parseSpaceLink(aclLinkTarget.href)
              // we found a spaceAclResourceSelector!
              // this was our goal since many lines above
              spaceAclResourceSelector = parsedAclLinkTargetHref
            }
          }
        }
      }

      const spaceAclResource = spaceAclResourceSelector && 
        (await resources.iterateSpaceNamedRepresentations(spaceAclResourceSelector).next())?.value
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