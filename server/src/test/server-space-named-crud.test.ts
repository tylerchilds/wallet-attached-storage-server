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

await describe('wallet-attached-storage-server space named CRUD', async t => {
  const database = await createTestDatabase()
  const server = new Server(database)

  let spaceUuid: string | undefined

  await test('can delete a resource', async t => {
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
      controller: keyForAlice.controller,
      // configure pointer to links of space
      link: `/space/${spaceUuid}/links/`,
    }
    const request = createPutSpaceByUuidRequest(spaceToCreate)
    const response = await server.fetch(request)
    assert.equal(response.status, 204, 'response status to PUT /spaces/ MUST be 204')

    await t.test('PUT homepage with http sig from space controller', async t => {
      const homepage = new Blob(['<!doctype html><h1>Home Page</h1><p>hello world<p>'], { type: 'text/html' })
      const requestUrl = new URL(`/space/${spaceUuid}/`, 'http://example.example')
      const requestMethod = 'PUT'
      const responseToPutHomepage = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        body: homepage,
        headers: {
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
          })
        }
      }))
      assert.ok(
        responseToPutHomepage.ok,
        'response to PUT /space/:uuid/ MUST be ok')
    })

    await t.test('GET homepage with http sig from space controller (to ensure PUT worked before trying DELETE)', async t => {
      const requestUrl = new URL(`/space/${spaceUuid}/`, 'http://example.example')
      const requestMethod = 'GET'
      const responseToPutHomepage = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        headers: {
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
          })
        }
      }))
      assert.ok(
        responseToPutHomepage.ok,
        `response to ${requestMethod} /space/:uuid/ MUST be ok`)
    })


    await t.test('DELETE homepage with http sig from space controller', async t => {
      const requestUrl = new URL(`/space/${spaceUuid}/`, 'http://example.example')
      const requestMethod = 'DELETE'
      const responseToPutHomepage = await server.fetch(new Request(requestUrl, {
        method: requestMethod,
        headers: {
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
          })
        }
      }))
      assert.ok(
        responseToPutHomepage.ok,
        `response to ${requestMethod} /space/:uuid/ MUST be ok`)
    })

  })

})

export function urlWithProtocol(url: URL | string, protocol: `${string}:`) {
  const url2 = new URL(url)
  url2.protocol = protocol
  return url2
}