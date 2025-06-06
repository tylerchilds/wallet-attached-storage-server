/**
 * @file tests of how server behaves handling requests with `Authorization: Signature ...`
 * with a keyId=did:key:...
 */
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

// create a database suitable for constructing a testable Server(database)
async function createTestDatabase() {
  const database = createDatabaseFromSqlite3Url('sqlite::memory:')
  await wasdb.initializeDatabaseSchema(database)
  return database
}

await describe('wallet-attached-storage-server handling requests with http signatures and did:key', async t => {
  const database = await createTestDatabase()
  const server = new Server(database)

  let spaceUuid: string | undefined

  await test('PUT space with controller=a and then GET as a', async t => {
    const keyForAlice = await Ed25519Signer.generate()
    spaceUuid = crypto.randomUUID()
    const createPutSpaceByUuidRequest = (spaceRepresentation: unknown) => new Request(new URL(`/space/${spaceUuid}`, 'http://example.example'), {
      method: 'PUT',
      body: JSON.stringify(spaceRepresentation),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const spaceToCreate = {
      controller: keyForAlice.controller
    }
    const request = createPutSpaceByUuidRequest(spaceToCreate)
    const response = await server.fetch(request)
    assert.equal(response.status, 204, 'response status to PUT /spaces/ MUST be 204')

    await t.test(`GET with no authorization`, async t => {
      const requestUrl = new URL(`/space/${spaceUuid}`, 'http://example.example')
      const requestMethod = 'GET'
      const responseToGetSpace = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        headers: {
          'Accept': 'application/json',
        },
      }))
      assert.equal(
        responseToGetSpace.status, 401,
        'response status to GET /space/:uuid MUST be 401')
    })

    await t.test(`GET with signature from space controller`, async t => {
      const requestUrl = new URL(`/space/${spaceUuid}`, 'http://example.example')
      const requestMethod = 'GET'
      const responseToGetSpace = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        headers: {
          'Accept': 'application/json',
          authorization: await createHttpSignatureAuthorization({
            signer: keyForAlice,
            url: requestUrl,
            method: requestMethod,
            headers: {},
            includeHeaders: [
              '(created)',
              '(expires)',
              '(key-id)',
              '(request-target)',
            ],
            created: new Date,
            expires: new Date(Date.now() + 30 * 1000),
          }),
        },
      }))
      assert.equal(
        responseToGetSpace.status, 200,
        'response status to GET /space/:uuid MUST be 200')
      const spaceFromGet = await responseToGetSpace.json()
      assert.equal(spaceFromGet.controller, spaceToCreate.controller)
    })

    await t.test(`GET with signature from unauthorized did:key`, async t => {
      // this key should not be sufficient to access the space
      const keyForBob = await Ed25519Signer.generate()
      const requestUrl = new URL(`/space/${spaceUuid}`, 'http://example.example')
      const requestMethod = 'GET'
      const responseToGetSpace = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        headers: {
          'Accept': 'application/json',
          authorization: await createHttpSignatureAuthorization({
            signer: keyForBob,
            url: requestUrl,
            method: requestMethod,
            headers: {},
            includeHeaders: [
              '(created)',
              '(expires)',
              '(key-id)',
              '(request-target)',
            ],
            created: new Date,
            expires: new Date(Date.now() + 30 * 1000),
          }),
        },
      }))
      assert.equal(
        responseToGetSpace.status, 401,
        'response status to GET /space/:uuid with signature from rando MUST be 401')
      const spaceFromGet = await responseToGetSpace.json()
      assert.equal(spaceFromGet.controller, undefined)
    })
  })
})

export function urlWithProtocol(url: URL | string, protocol: `${string}:`) {
  const url2 = new URL(url)
  url2.protocol = protocol
  return url2
}