import type { ITestModule, ITestOptions } from "../types";

export const test: ITestModule = async function (t, options: ITestOptions) {
  t.test('can create a server, make a request to it, and get an ok response', async function () {
    const { createRequest } = options
    const { createServer } = options
    const server = createServer()
    try {
      const response = await server.fetch(createRequest('/bar/baz?boo=1'))
      options.assert.ok(response.ok)
      options.assert.equal(response.status, 200)
    } finally {
      server.close()
    }
  })
}

export default test
