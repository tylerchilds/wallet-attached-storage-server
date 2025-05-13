export interface Fetchable {
  fetch(request: Request): Promise<Response>
}

export interface IServer extends Fetchable {
  close: () => void,
}

export type IAssert = typeof import('node:assert')

export interface ITestOptions {
  assert: IAssert
  createRequest: (url: string | URL, init?: RequestInit) => Request
  createServer: () => IServer
}

export type ITestModule = (t: import('node:test').TestContext, options: ITestOptions) => Promise<void>
