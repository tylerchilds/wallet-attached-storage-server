import type { IAssert, IServer, ITestModule, ITestOptions } from './types'
import simpleTest from "./tests/simple.ts"

class WalletAttachedStorageServerTestSuite {
  tests: ITestModule[] = [
    simpleTest,
  ]
  async test(t: import('node:test').TestContext, options: ITestOptions) {
    for (const test of this.tests) {
      await test(t, options)
    }
  }
}

export default WalletAttachedStorageServerTestSuite

export { defaultCreateRequest } from "./testing.ts"
