import { createDocumentLoader } from "dzcap/document-loader";
import { isDidKey } from "dzcap/did"
import { parseRootZcapUrn, urlWithProtocol } from "hono-zcap";
import { verifyCapabilityInvocation } from "dzcap/invocation-http-signature";
import type { DID } from "dzcap/did"
import type { IDocumentLoader } from "dzcap/invocation-http-signature";
import type { ISpace } from "wallet-attached-storage-database/types";
import type { IZcapCapability } from "dzcap/zcap-invocation-request";

export default async function authorizeWithZcap(request: Request, options: {
  space(): Promise<ISpace>,
  expectedTarget?: string,
  expectedAction?: string,
  expectedRootCapability?: string | IZcapCapability[]
  documentLoader?: IDocumentLoader
  onVerificationError?: (error: unknown) => void
  resolveRootZcap?: (urn: `urn:zcap:root:${string}`) => Promise<{
    controller?: DID,
    "@context": "https://w3id.org/zcap/v1",
    id: string,
    invocationTarget: string,
  }>,
  // if true, the middleware will respond 401 for any requests with no capability-invocation and signature
  required?: boolean,
  trustHeaderXForwardedProto?: boolean
}): Promise<boolean> {
  const defaultResolveRootZcap = async (urn: `urn:zcap:root:${string}`) => {
    const { invocationTarget } = parseRootZcapUrn(urn)
    const space = await options.space()
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
  const resolveRootZcap = options.resolveRootZcap ?? defaultResolveRootZcap
  const documentLoader = options.documentLoader || createDocumentLoader(async url => {
    if (url.startsWith(`urn:zcap:root:`)) {
      const resolved = await resolveRootZcap(url as `urn:zcap:root:${string}`)
      if (!resolved) {
        throw new Error(`resolveRootZcap returned falsy when resolving ${url}`, {
          cause: {
            url,
          }
        })
      }
      return {
        document: resolved,
        documentUrl: url,
      }
    }
    throw new Error(`unable to load document ` + url)
  })
  // const invocation = ctx.req.header('capability-invocation')
  // const encodedCapabilityMatch = invocation?.match(/capability="([^"]+)"/)
  // const encodedCapability = encodedCapabilityMatch?.[1]
  // const capabilityUngzipped = encodedCapability && (await pako.ungzip(Buffer.from(encodedCapability, 'base64url')))
  // const capabilityParsed = capabilityUngzipped && JSON.parse(new TextDecoder().decode(capabilityUngzipped))

  let hasProvenSufficientAuthorization = false

  if (request.headers.has('capability-invocation')) {
    try {
      // zcaps only supported on https urls.
      const assumedInvocationTarget = urlWithProtocol(request.url, 'https:')
      const expectedTarget = options.expectedTarget ?? assumedInvocationTarget.toString()
      await verifyCapabilityInvocation(request, {
        expectedTarget,
        expectedAction: options.expectedAction ?? request.method,
        expectedRootCapability: options.expectedRootCapability ?? `urn:zcap:root:${encodeURIComponent(assumedInvocationTarget.toString())}`,
        documentLoader,
      })
      hasProvenSufficientAuthorization = true
    } catch (error) {
      options.onVerificationError?.(error)
      return false
    }
  }

  if (hasProvenSufficientAuthorization) {
    return true
  }

  return false
}
