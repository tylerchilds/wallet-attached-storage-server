import { getControllerOfDidKeyVerificationMethod } from "@did.coop/did-key-ed25519/did-key"
import { getVerifierForKeyId } from "@did.coop/did-key-ed25519/verifier"
import { HttpSignatureAuthorization } from "authorization-signature"
import type { ISpace } from "wallet-attached-storage-database/types"

class KeyNotAuthorized extends Error { }

export default async function assertRequestIsSignedBySpaceController(options: {
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
