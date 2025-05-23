import type { Context, Next, Env } from "hono"
import { SpaceRepository } from "wallet-attached-storage-database"
import ResourceRepository from "wallet-attached-storage-database/resource-repository"
import type { Database, ISpace } from "wallet-attached-storage-database/types"
import { z } from "zod"

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


interface ISpaceResourceHonoOptions<P extends string> {
  space: () => Promise<ISpace>
  data: Database,
}
export async function authorizeRequestWithSpaceAcl<P extends string>(
  request: Pick<Request, 'url' | 'method'>,
  options: ISpaceResourceHonoOptions<P>
): Promise<boolean> {
  const resources = new ResourceRepository(options.data)
  const spaces = new SpaceRepository(options.data)

  const space = await options.space()
  if (!space) return false

  if (!space.link) {
    return false
  }

  // we are going to determine the link to the space acl, if there is one
  let spaceAclResourceSelector:
    | { space: string, name: string }
    | undefined
  {
    // parse the link to see if we can understand it
    const parsedLink = parseSpaceLink(space.link)

    if (!parsedLink) {
      console.warn('unable to parse space link', space.link)
      return false
    }

    // We parsed the space link to a space resource.
    // Let's look up representations of that as a linkset.
    let linksetJsonRepresentation
    for await (const repr of resources.iterateSpaceNamedRepresentations(parsedLink)) {
      if (repr.blob.type === 'application/linkset+json') {
        linksetJsonRepresentation = repr
        break
      }
    }

    if (!linksetJsonRepresentation) return false

    const linkset = await parseLinksetJsonBlob(linksetJsonRepresentation.blob)

    const aclLinkTarget = iterateAclLinkTargets(linkset).next().value
    if (aclLinkTarget) {
      const parsedAclLinkTargetHref = parseSpaceLink(aclLinkTarget.href)
      // we found a spaceAclResourceSelector!
      // this was our goal since many lines above
      spaceAclResourceSelector = parsedAclLinkTargetHref
    }
  }

  // if we could not determine an acl,
  // we cannot authorize the request
  if (!spaceAclResourceSelector) return false

  // now we have an acl resource selector.
  // let's find a representation of it
  const acl = await queryAcl(resources, spaceAclResourceSelector)

  if (acl && checkIfRequestIsAuthorizedViaAcl(request, acl)) {
    return true
  }

  return false
}

type ACL = Exclude<Awaited<ReturnType<typeof queryAcl>>, undefined>

function checkIfRequestIsAuthorizedViaAcl(
  request: Pick<Request, 'url' | 'method'>,
  acl: ACL
): boolean {
  // we want to find authorizations relevant to this request
  function* matchRequestToAuthorizations(acl: ACL, request: { path: string, method: string }) {
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
  const relevantAuthorizations = acl
    ? Array.from(matchRequestToAuthorizations(acl, {
      path: new URL(request.url).pathname,
      method: request.method,
    }))
    : []
  if (relevantAuthorizations.length > 0) {
    return true
  }
  return false
}

async function queryAcl(
  resources: ResourceRepository,
  selector: { space: string, name: string },
) {
  const spaceAclResource = selector &&
    (await resources.iterateSpaceNamedRepresentations(selector).next())?.value
  const spaceAclObject = spaceAclResource && JSON.parse(await spaceAclResource.blob.text())
  const shapeOfSpaceAcl = z.object({
    authorization: z.array(z.object({
      agentClass: z.string(),
      accessTo: z.array(z.string()),
      mode: z.array(z.string()),
    }))
  })
  const spaceAcl = spaceAclObject ? shapeOfSpaceAcl.parse(spaceAclObject) : undefined
  return spaceAcl
}

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

function* iterateAclLinkTargets(linkset: LinksetFromZod) {
  for (const ctx of linkset.linkset) {
    for (const target of ctx.acl ?? []) {
      yield target
    }
  }
}