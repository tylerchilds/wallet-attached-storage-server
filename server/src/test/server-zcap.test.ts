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

await describe('wallet-attached-storage-server ZCAP authorization', async t => {
  const database = await createTestDatabase()
  const server = new Server(database)

  let spaceUuid: string | undefined

  await test('PUT /space/:uuid', async t => {
    spaceUuid = crypto.randomUUID()
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

  await test(`GET space ${spaceUuid}`, async t => {
    throw new Error('todo')
  })
})
