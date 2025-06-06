import { describe, test } from 'node:test'
import { Server } from '../server.ts'
import { createDatabaseFromSqlite3Url } from 'wallet-attached-storage-database/sqlite3'
import * as wasdb from 'wallet-attached-storage-database'
import assert from 'assert'
import { Ed25519Signer } from '@did.coop/did-key-ed25519'
import { createHttpSignatureAuthorization } from 'authorization-signature'
import MIMEType from "whatwg-mimetype"
import { createRequestForCapabilityInvocation } from 'dzcap/zcap-invocation-request'
import { delegate } from 'dzcap/delegation'
import type { ISpace } from 'wallet-attached-storage-database/types'
import ResourceRepository from 'wallet-attached-storage-database/resource-repository'
import { collect } from 'streaming-iterables'
import { readFilesFromTar } from 'wallet-attached-storage-database/space-tar'

// create a database suitable for constructing a testable Server(database)
async function createTestDatabase() {
  const database = createDatabaseFromSqlite3Url('sqlite::memory:')
  await wasdb.initializeDatabaseSchema(database)
  return database
}

await test('server exporting space to tar', async t => {
  const database = await createTestDatabase()
  const server = new Server(database)
  const spaceUuid = crypto.randomUUID()
  // add a space
  {
    await new wasdb.SpaceRepository(database).put({
      uuid: spaceUuid,
    })
  }
  // add a resource
  {
    const example1 = new File(['example1 content'], 'example1', { type: 'text/plain' })
    const resources = new ResourceRepository(database)
    await resources.putSpaceNamedResource({
      space: spaceUuid,
      name: example1.name,
      representation: example1,
    })
  }
  // export as tar
  {
    const requestToGetSpaceTar = new Request(`https://example.example/space/${spaceUuid}`, {
      headers: {
        accept: `application/x-tar`,
      }
    })
    const responseToGetSpaceTar = await server.fetch(requestToGetSpaceTar)
    console.debug('responseToGetSpaceTar', responseToGetSpaceTar)
    if (!responseToGetSpaceTar.ok) {
      console.warn(`unexpected not ok response from server when exporting space as tar`, responseToGetSpaceTar)
      throw new Error(`Unable to export space as tar`, { cause: { responseToGetSpaceTar } })
    }
    assert.equal(responseToGetSpaceTar.status, 200, `expected response status to be 200`)

    // ensure the response content-type is application/x-tar
    assert.equal(responseToGetSpaceTar.headers.get('content-type'), 'application/x-tar',
      `expected response content-type to be tar`)

    const exportedTar = await responseToGetSpaceTar.blob()
    const files = await collect(readFilesFromTar(exportedTar.stream()))
    console.debug(`exported tar files`, files)
    assert.equal(files.length, 1, `expected to get files from tar`)
  }
})

async function addSpaceToServer(server: Server, spaceIn?: ISpace | undefined) {
  const spaceUuid = spaceIn?.uuid || crypto.randomUUID()
  const key = await Ed25519Signer.generate()
  const space = spaceIn ? spaceIn : {
    controller: key.controller,
    uuid: spaceUuid
  }
  const spacePath = `/space/${spaceUuid}`
  const spaceURL = new URL(spacePath, `https://example.example`)
  const requestToAddSpace = new Request(spaceURL, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(space, undefined)
  })
  const responseToAddSpace = await server.fetch(requestToAddSpace)
  if (!responseToAddSpace.ok) {
    console.warn(`unexpected not ok response from server when adding space`, responseToAddSpace)
    throw new Error(`Unable to add space`, { cause: { responseToAddSpace } })
  }
  return { space }
}
