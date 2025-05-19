import type { Context, Next, Env } from "hono"
import { SpaceRepository } from "wallet-attached-storage-database"
import { createZcapMiddleware, parseRootZcapUrn } from "hono-zcap"
import { isDidKey } from "dzcap/did"

export function zcapAuthorization(options: {
  spaces: Pick<SpaceRepository, 'getById'>
  getSpaceId: (c: Context) => string | undefined
  trustHeaderXForwardedProto?: boolean
}) {
  return async <E extends Env>(c: Context<E>, next: Next) => {
    const spaceId = options.getSpaceId(c)
    if (!(spaceId)) {
      return next()
    }
    const space = await options.spaces.getById(spaceId)
    if (!(space)) {
      return next()
    }

    // it's only required if the space has a controller AND the space is not public
    let zcapInvocationRequired = false
    {

      const controller = space.controller
      if (controller) {
        zcapInvocationRequired = true
      }
    }

    const resolveRootZcap = async (urn: `urn:zcap:root:${string}`) => {
      console.debug('resolving root zcap', {urn})
      const { invocationTarget } = parseRootZcapUrn(urn)
      const controller = space.controller
      if (!controller || !isDidKey(controller)) {
        throw new Error(`unable to resolve controller did:key for root zcap urn`, {
          cause: {
            urn,
          }
        })
      }
      console.debug('resolved root zcap', {urn,controller})
      return {
        "@context": "https://w3id.org/zcap/v1" as const,
        invocationTarget,
        id: urn,
        controller,
      }
    }

    // check zcap
    return createZcapMiddleware(
      {
        required: zcapInvocationRequired,
        trustHeaderXForwardedProto: options?.trustHeaderXForwardedProto,
        resolveRootZcap,
        expectedAction: c.req.raw.method.toUpperCase(),
      })(c, next)
  }
}
