# wallet-attached-storage-server

A web server that can store and serve all kinds of data.

Clients authenticate with ed25519 keys represented as a `did:key`.

This is a JavaScript implementation of [Wallet Attached Storage Server specification][WAS].

## Goals

* represent [WAS][] protocol logic in a JavaScript library that does not depend on the node.js (or any other runtime) standard library.
  * this is accomplished by using hono as a web framework. Any hono app can be run on nodejs via @hono/node-server, but doesn't directly depend on nodejs.

## Running it

Don't use this package to run a server. This is just a library.

Check out [wallet-attached-storage-server-nodejs](../nodejs/) to run it with nodejs. That's probably what you want.

## Usage

```typescript
import { serve } from '@hono/node-server'
import WAS from 'wallet-attached-storage-server'

const wasServer = new WAS.Server()
const nodeServer = serve({
  fetch: wasServer.fetch,
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 0
}, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
```

[WAS]: https://wallet.storage/spec
