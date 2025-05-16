import type { Context, Next } from 'hono'
import SpaceRepository from '../../../database/src/space-repository.ts'
import { CreateSpaceRequest } from '../api.zod.ts'
import { z } from 'zod'
import { HttpSignatureAuthorization } from 'authorization-signature'
import { getVerifierForKeyId } from "@did.coop/did-key-ed25519/verifier"
import { getControllerOfDidKeyVerificationMethod } from "@did.coop/did-key-ed25519/did-key"

/**
 * build a route to get all spaces from a space repository
 * representing as a collection of space items
 * @param repo - the space repository to query
 * @returns - hono handler
 */
export const GET = (repo: SpaceRepository) => async (c: Context, next: Next) => {
  const spacesArray = await repo.toArray()
  return c.json({
    name: 'Spaces',
    items: spacesArray,
    totalItems: spacesArray.length,
    type: ['Collection'],
  })
}

/**
 * build a route that handles requests to create a space in a space repository
 * @param repo - the space repository to query/update
 * @returns - hono handler
 */
export const POST = (repo: SpaceRepository) => async (c: Context, next: Next) => {
  // check authorization
  let authenticatedClientDid: string | undefined
  {
    const authorization = c.req.raw.headers.get('authorization')
    console.debug('POST /spaces/ authorization', authorization)
    const verified = await HttpSignatureAuthorization.verified(c.req.raw, {
      async getVerifier(keyId) {
        const { verifier } = await getVerifierForKeyId(keyId)
        return verifier
      },
    })
    const httpSignatureKeyIdDid = getControllerOfDidKeyVerificationMethod(verified.keyId)
    authenticatedClientDid = httpSignatureKeyIdDid
  }

  // request body is optional
  const bodyText = await c.req.text().then(t => t.trim())
  let requestBodyObject
  if ( ! bodyText) {
    // no request body, no requestBodyObject
    requestBodyObject = {
      controller: authenticatedClientDid,
      uuid: crypto.randomUUID(),
    }
  } else {
    requestBodyObject = JSON.parse(bodyText)
  }

  let createSpaceRequest: z.TypeOf<typeof CreateSpaceRequest>
  try {
    createSpaceRequest = CreateSpaceRequest.parse(requestBodyObject)
  } catch (error) {
    console.warn('error parsing request body', error)
    return c.json(error, 400)
  }
  const created = await repo.create(createSpaceRequest)
  const pathnameOfSpace = `/space/${createSpaceRequest.uuid}`
  return c.newResponse(null, 201, {
    'Location': pathnameOfSpace,
  })
}
