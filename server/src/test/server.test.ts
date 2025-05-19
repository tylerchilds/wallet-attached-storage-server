import { describe, test } from 'node:test'
import { Server } from '../server.ts'
import { createDatabaseFromSqlite3Url } from 'wallet-attached-storage-database/sqlite3'
import * as wasdb from 'wallet-attached-storage-database'
import assert from 'assert'
import { Ed25519Signer } from '@did.coop/did-key-ed25519'
import { createHttpSignatureAuthorization } from 'authorization-signature'
import MIMEType from "whatwg-mimetype"

// create a database suitable for constructing a testable Server(database)
async function createTestDatabase() {
  const database = createDatabaseFromSqlite3Url('sqlite::memory:')
  await wasdb.initializeDatabaseSchema(database)
  return database
}

await describe('server', async t => {
  const database = await createTestDatabase()
  const server = new Server(database)

  await test('GET /spaces/', async t => {
    // hostname and path will be ignored by server.fetch
    const request = new Request('http://localhost:3000/spaces/')
    const response = await server.fetch(request)

    assert.equal(
      response.status, 200,
      'response status to GET /spaces/ MUST be 200')
    assert.ok(
      response.ok,
      `response to GET /spaces/ MUST be ok`)

    const responseBody = await response.json()
    await t.test('response body is a collection', async t => {
      assert.equal(responseBody.totalItems, 0, `responseBody.totalItems MUST be 0`)
      assert.equal(responseBody.items.length, 0, `responseBody.length MUST be 0`)
    })

    await t.test('with ed25519 signature authorization', async t => {
      const key = await Ed25519Signer.generate()
      const requestUrl = new URL('/spaces/', 'http://example.example')
      const requestMethod = 'GET'
      const request = new Request(requestUrl, {
        method: requestMethod,
        headers: {
          authorization: await createHttpSignatureAuthorization({
            signer: key,
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
      })
      const response = await server.fetch(request)
      assert.equal(
        response.status, 200,
        'response status to GET /spaces/ MUST be 200')
    })

    await t.test('with ed25519 http signature capability-invocation', async t => {
      const key = await Ed25519Signer.generate()
      const requestUrl = new URL('/spaces/', 'http://example.example')
      const requestMethod = 'GET'
      const request = new Request(requestUrl, {
        method: requestMethod,
        headers: {
          authorization: await createHttpSignatureAuthorization({
            signer: key,
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
      })
      const response = await server.fetch(request)
      assert.equal(
        response.status, 200,
        'response status to GET /spaces/ MUST be 200')
    })    
  })

  let createdSpaceHref: string | null
  await test('POST /spaces/', async t => {
    const spaceToCreate = {
      uuid: crypto.randomUUID(),
      name: 'test',
    }

    const request = new Request('http://localhost:3000/spaces/', {
      method: 'POST',
      body: JSON.stringify(spaceToCreate),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const response = await server.fetch(request)
    assert.equal(
      response.status, 201,
      'response status to POST /spaces/ MUST be 201')
    assert.ok(
      response.ok,
      `response to POST /spaces/ MUST be ok`)

    const spaceHrefFromResponseLocation = response.headers.get('Location')
    createdSpaceHref = spaceHrefFromResponseLocation
    assert.ok(spaceHrefFromResponseLocation, `response to POST /spaces/ MUST have a Location header`)

    const urlToCreatedSpace = new URL(spaceHrefFromResponseLocation, request.url)



    // The response to POST /spaces/ should link to the resource
    // representing the space.
    // This link should be in the response Location header.
    // Clients should be able to 'follow' that link and
    // request to GET the space resource.
    await t.test(
      'GET link from response Location header', async t => {
        // use request2 name to avoid colliding with earlier 'request'
        const request2 = new Request(new URL(spaceHrefFromResponseLocation, request.url))
        const response2 = await server.fetch(request2)
        // @todo: maybe this should be 4xx because
        // the space has a controller
        // which should trigger server to do auth checks
        // and this reuqest has no auth
        assert.equal(
          response2.status, 200,
          'response status to GET /spaces/ MUST be 200')

        const response2BodyObject = await response2.json()
        // ensure every key we sent in the POST
        // was persisted and sent back in response to GET
        for (const key of Object.keys(spaceToCreate)) {
          assert.equal(
            response2BodyObject[key],
            spaceToCreate[key],
            `response2BodyObject.${key} MUST match spaceToCreate.${key}`)
        }
      })

    await t.test(`PUT ${spaceHrefFromResponseLocation}/foo`, async t => {
      const objectToPutFoo = {
        foo: 'bar',
        uuid: crypto.randomUUID(),
      }
      const blobToPutFoo = new Blob(
        [JSON.stringify(objectToPutFoo)],
        { type: 'application/json' })
      const request2 = new Request(new URL(`${spaceHrefFromResponseLocation}/foo`, request.url), {
        method: 'PUT',
        body: blobToPutFoo,
        headers: {
          'Accept': 'application/json',
        }
      });
      const response2 = await server.fetch(request2)
      assert.ok(
        response2.ok,
        `response MUST be ok`)

      // PUT worked.
      // Now let's validate that it persisted
      // and can be retrieved via GET
      const requestToGetFoo = new Request(request2.url)
      const responseToGetFoo = await server.fetch(requestToGetFoo)
      assert.equal(
        responseToGetFoo.status, 200,
        `responseToGetFoo status MUST be 200`)
      assert.equal(
        responseToGetFoo.headers.get('Content-Type'),
        blobToPutFoo.type,
        `content-type from GET foo is same as that from PUT foo`
      )
      const objectFromGetFoo = await responseToGetFoo.json()
      assert.equal(objectFromGetFoo.uuid, objectToPutFoo.uuid)
    })

    // all of these urls should be fair game to PUT to to put a name within the name space
    for (const href of [
      `${spaceHrefFromResponseLocation}/`,
      `${spaceHrefFromResponseLocation}/foo/`,
      `${spaceHrefFromResponseLocation}/dir/`,
      `${spaceHrefFromResponseLocation}/dir/bar`,
      `${spaceHrefFromResponseLocation}/dir/dir/`,
      `${spaceHrefFromResponseLocation}/dir/dir/dir/baz`,
      `${spaceHrefFromResponseLocation}/dir/dir/dir/baz/whois.vp`,
      `${spaceHrefFromResponseLocation}/dir/dir/dir/baz/whois.vp.json`,
    ]) {
      await t.test(`PUT ${href}`, async t => {
        const response = await server.fetch(new Request(new URL(href, request.url), {
          method: 'PUT',
          body: new Blob(['hello world'], { type: 'text/plain' })
        }))
        assert.equal(
          response.ok, true,
          `response to PUT ${href} must be ok`
        )

        // it might have suffix e.g. ';charset=UTF-8' so be flexible and parse it
        const responseContentTypeMime = new MIMEType(response.headers.get('Content-Type'))
        assert.equal(responseContentTypeMime.essence, 'text/plain', `response to PUT ${href} must have content-type text/plain`)
      })
    }

  })

  await test('PUT /space/:uuid', async t => {
    const spaceUuid = crypto.randomUUID()
    const createPutSpaceByUuidRequest = (spaceRepresentation: unknown) => new Request(new URL(`/space/${spaceUuid}`, 'http://example.example'), {
      method: 'PUT',
      body: JSON.stringify(spaceRepresentation),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    const request = createPutSpaceByUuidRequest({})
    const response = await server.fetch(request)
    assert.equal(response.status, 204, 'response status to PUT /spaces/ MUST be 204')

    // make a second PUT request to update name
    const spaceWithName = { name: `name ${crypto.randomUUID()}` }
    const response2 = await server.fetch(createPutSpaceByUuidRequest(spaceWithName))
    assert.equal(response2.status, 204, 'response2 status to PUT /spaces/ MUST be 204')

    // now GET it and see if the name update worked
    {
      const responseToGetSpace = await server.fetch(new Request(new URL(`/space/${spaceUuid}`, 'http://example.example'), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }))
      assert.equal(
        responseToGetSpace.status, 200,
        'response status to GET /space/:uuid MUST be 200')
      const spaceFromGet = await responseToGetSpace.json()
      assert.equal(spaceFromGet.name, spaceWithName.name, `space name from GET MUST match space name from most recent PUT`)
    }
  })
})
