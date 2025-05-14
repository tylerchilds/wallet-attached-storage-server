import type { ITestModule, ITestOptions } from "../types";
import { Ed25519Signer } from "@did.coop/did-key-ed25519"
import { createHttpSignatureAuthorization } from "authorization-signature"

export const test: ITestModule = async function (t, options: ITestOptions) {

  t.test('can GET /spaces/', async function () {
    const { createRequest } = options
    const { createServer } = options
    const server = createServer()
    try {
      const response = await server.fetch(createRequest('/spaces/'))
      options.assert.equal(response.status, 200)
      options.assert.ok(response.ok, `response to GET /spaces/ MUST be ok`)
    } finally {
      server.close()
    }
  })

  // @todo test POST /spaces/ with a controller key, then try to GET it

  t.test('can POST /spaces/ then GET /spaces/ to ensure persistence', async function () {
    const { createRequest } = options
    const { createServer } = options
    const server = createServer()
    try {
      const spaceToCreate = {
        name: `my space ${crypto.randomUUID()}`,
        uuid: crypto.randomUUID(),
      }
      const response = await server.fetch(createRequest('/spaces/', {
        method: 'POST',
        body: JSON.stringify(spaceToCreate),
        headers: {
          'Content-Type': 'application/json',
        }
      }))
      // check response to POST /spaces/
      {
        if (!response.ok) {
          console.debug('response', response, await response.clone().text())
        }
        options.assert.ok(response.ok, `response to POST /spaces/ MUST be ok`)
        // response to POST /spaces/ MUST have a Location header linking to the space resource
        const locationHeader = response.headers.get('Location')
        console.debug('locationHeader', locationHeader)
        options.assert.ok(locationHeader, `response to POST /spaces/ MUST have a Location header`)
      }

      // now GET /spaces/
      const responseToGetSpaces = await server.fetch(createRequest('/spaces/'))
      options.assert.ok(response.ok, `response to GET /spaces/ MUST be ok`)
      const spacesCollection = await responseToGetSpaces.json()
      options.assert.equal(spacesCollection.items.length, 1, `spacesCollection.length MUST be 1`)
      options.assert.equal(spacesCollection.items[0].name, spaceToCreate.name, `space.name from GET /spaces/ MUSt match space.name from POST /spaces/`)
    } finally {
      server.close()
    }
  })

  /*
  This tests POST /spaces/ with no request body and http signature authorization.
  */
  t.test('POST /spaces/ with http signature authorization and no request body', async t => {
    const key = await Ed25519Signer.generate()

    const { createRequest } = options
    const request = createRequest('/spaces/', {
      method: 'POST',
      body: null,
      headers: {
        Authorization: await createHttpSignatureAuthorization({
          signer: key,
          url: new URL('/spaces/', 'http://example.example'),
          method: 'POST',
          headers: {},
          includeHeaders: [
            '(key-id)',
            '(request-target)',
          ],
          created: new Date,
        })
      }
    })

    const { createServer } = options
    const server = createServer()
    try {
      const response = await server.fetch(request)
      if ( ! response.ok) {
        console.debug('response', response, await response.clone().text())
      }
      options.assert.equal(response.ok, true, `response to POST /spaces/ MUST be ok`)
    } finally {
      server.close()
    }
  })
}

export default test
