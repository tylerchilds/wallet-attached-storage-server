import type { Context, Next, Env } from "hono"
import { createMiddleware } from "hono/factory"
import { SpaceRepository } from "wallet-attached-storage-database"
import { createZcapMiddleware, parseRootZcapUrn } from "hono-zcap"
import { isDidKey } from "dzcap/did"
import type { ISpace } from "wallet-attached-storage-database/types"
import { HttpSignatureAuthorization } from "authorization-signature"
import { getVerifierForKeyId } from "@did.coop/did-key-ed25519/verifier"
import { getControllerOfDidKeyVerificationMethod } from "@did.coop/did-key-ed25519/did-key"
import { HTTPException } from "hono/http-exception"
import { SpaceNotFound } from "wallet-attached-storage-database/space-repository"

/**
 * factory for a middleware to authorize
 * requests to a space-controlled resource.
 * it should support at least these kinds of authorization:
 * * http signature signed by the space controller
 * * http signature over a capability-invocation
 *   delegated by the space controller to the signature keyId
 * @param options 
 * @returns 
 */
export function authorizeWithSpace(options: {
  getSpace: (c: Context) => Promise<ISpace>
  trustHeaderXForwardedProto?: boolean
}) {
  const spaceAuthorizationMiddleware = createMiddleware(async (c, next) => {
    const request = c.req.raw
    const capabilityInvocation = request.headers.get('capability-invocation')

    if (capabilityInvocation) {
      // use the zcapAuthorization middleware
      // to verify the invocation
      return zcapAuthorization(options)(c, next)
    }

    // there is no capability invocation.

    // if there is a space controller,
    // the only other thing that should authorize the request
    // is if it is signed by the space contoller itself.
    let space: ISpace | null
    try {
      space = await options.getSpace(c)
    } catch (error) {
      if (error instanceof SpaceNotFound) {
        // there is no space for this request.
        // that might be fine? might not. we'll decide later
        space = null
      } else {
        // unexpected error? throw it
        throw error
      }
    }
    if (space?.controller) {
      try {
        await assertRequestIsSignedBySpaceController({
          request,
          space,
        })
      } catch (error) {
        const message = `request signature keyId is not authorized to invoke this action`
        throw new HTTPException(401, {
          message,
          res: new Response(JSON.stringify({ message }), { status: 401 }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cause: error,
        })
      }
    }

    await next()
  })
  return spaceAuthorizationMiddleware
}

class KeyNotAuthorized extends Error { }

async function assertRequestIsSignedBySpaceController(options: {
  request: Request,
  space: ISpace,
}) {
  const verified = await HttpSignatureAuthorization.verified(options.request, {
    async getVerifier(keyId) {
      const { verifier } = await getVerifierForKeyId(keyId)
      return verifier
    },
  })
  const authenticatedRequestKeyId = verified.keyId
  const authenticatedRequestDid = getControllerOfDidKeyVerificationMethod(authenticatedRequestKeyId)
  if (authenticatedRequestDid === options.space.controller) {
    // assertion satisfied
    return
  }
  throw new KeyNotAuthorized(`key ${authenticatedRequestKeyId} is not authorized to access any space`)
}

// create a middleware that authorizes
// requests that include a zcap.
export function zcapAuthorization(options: {
  getSpace: (c: Context) => Promise<ISpace>
  trustHeaderXForwardedProto?: boolean
}) {
  return async <E extends Env>(c: Context<E>, next: Next) => {
    const space = await options.getSpace(c)
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
      const { invocationTarget } = parseRootZcapUrn(urn)
      const controller = space.controller
      if (!controller || !isDidKey(controller)) {
        throw new Error(`unable to resolve controller did:key for root zcap urn`, {
          cause: {
            urn,
          }
        })
      }
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
