import type { ITestModule, ITestOptions } from "../types";

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

  t.test('can POST /spaces/ then GET /spaces/ to ensure persistence', async function () {
    const { createRequest } = options
    const { createServer } = options
    const server = createServer()
    try {
      const spaceToCreate = {
        name: `my space ${crypto.randomUUID()}`
      }
      const response = await server.fetch(createRequest('/spaces/', {
        method: 'POST',
        body: JSON.stringify(spaceToCreate),
        headers: {
          'Content-Type': 'application/json',
        }
      }))
      if ( ! response.ok) {
        console.debug('response', response, await response.clone().text())
      }
      options.assert.ok(response.ok, `response to POST /spaces/ MUST be ok`)

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

}

export default test
