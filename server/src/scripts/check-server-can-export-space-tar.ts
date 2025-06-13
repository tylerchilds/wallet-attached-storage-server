#!/usr/bin/env node --no-warnings

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { StorageClient } from "@wallet.storage/fetch-client"
import { Ed25519Signer } from "@did.coop/did-key-ed25519";
import { createHttpSignatureAuthorization } from "authorization-signature";
import { collect } from "streaming-iterables";
import { readFilesFromTar } from "wallet-attached-storage-database/space-tar"

// when this script is executed directly, run the main function.
if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(...process.argv).catch(error => {
    console.error(error);
    process.exit(1)
  })
}

async function main(...argv: string[]) {
  const options = {
    space: { type: 'string' },
    storage: { type: 'string', }
  } as const;
  const args = parseArgs({
    args: argv.slice(2),
    options,
  })

  // parse --url arg to URL
  if (!args.values.storage) throw new Error("Missing required argument: --storage");
  let storageUrl: URL;
  try {
    storageUrl = new URL(args.values.storage);
  } catch (error) {
    throw new Error(`Invalid storage URL: ${args.values.storage}`, { cause: error });
  }

  // let r1 be a resource of type text/plain and content 'r1'
  const r1Representation = new Blob(['r1'], { type: 'text/plain' });

  // create a key to use for authn
  const key = await Ed25519Signer.generate()

  // create storage client for space.
  const storage = new StorageClient(storageUrl)

  // create a space.
  const spaceId: `urn:uuid:${string}` = args.values.space?.startsWith('urn:uuid:')
    ? args.values.space as `urn:uuid:${string}`
    : `urn:uuid:${args.values.space || crypto.randomUUID()}` as const;
  const space = storage.space(spaceId);

  // add the space to storage
  const spaceToAdd = {
    controller: key.controller,
  }
  const responseToPutSpace = await space.put(new Blob([JSON.stringify(spaceToAdd)], { type: 'application/json' }));
  console.debug('responseToPutSpace', { status: responseToPutSpace.status })

  // create a resource in the space.
  const r1 = space.resource('r1')
  const responseToPutR1 = await r1.put(r1Representation, { signer: key })
  console.debug('responseToPutR1', { status: responseToPutR1.status })
  if (!responseToPutR1.ok) throw new Error(`Failed to put r1 (${responseToPutR1.status}}`, { cause: { response: responseToPutR1 } })

  // export the space to tar
  const spaceURL = new URL(space.path, storageUrl)
  const requestToGetSpaceTarHeaders = {
      accept: `application/x-tar`,
  }
  const requestToGetSpaceTar = new Request(spaceURL, {
    headers: {
      ...requestToGetSpaceTarHeaders,
      authorization: await createHttpSignatureAuthorization({
        signer: key,
        url: spaceURL,
        method: 'GET',
        headers: requestToGetSpaceTarHeaders,
        includeHeaders: [
          'accept',
          '(created)',
          '(expires)',
          '(key-id)',
          '(request-target)',
        ],
        created: new Date,
        expires: new Date(Date.now() + 30 * 1000),
      }),
    }
  })
  const responseToGetSpaceTar = await fetch(requestToGetSpaceTar)
  console.debug('responseToGetSpaceTar', { status: responseToGetSpaceTar.status })

  // extract tar
  const filesFromTar = await collect(readFilesFromTar(responseToGetSpaceTar.body as ReadableStream));
  console.debug('filesFromTar', filesFromTar)

  // ensure exported tar contains the resource
  let fileIncludesR1 = false;
  for (const file of filesFromTar) {
    const fileBasenameEncoded = file.name.split('/').pop();
    const fileBasenameWithQuery = fileBasenameEncoded && decodeURIComponent(fileBasenameEncoded)
    const fileBasename = fileBasenameWithQuery?.split('?')[0]
    if (fileBasename === 'r1') {
      fileIncludesR1 = true;
      const fileContent = await file.text();
      if (fileContent !== await r1Representation.text()) {
        throw new Error(`File r1 content does not match expected content`);
      }
    }
  }
  if ( ! fileIncludesR1) throw new Error(`Exported tar does not contain file r1`);
}
