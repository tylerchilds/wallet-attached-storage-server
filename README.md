# wallet-attached-storage-server-monorepo

This is a monorepo package with many npm workspaces related to <https://wallet.storage/spec>.

## Development

Prerequisites
* [Install Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

Use npm to install the packages in this monorepo, fetch dependencies, etc.

```shell
npm install
```

### Run wallet-attached-storage-server

```shell
npm run dev
```

This should show:

> Listening on http://localhost:8080

You should be able to open that link in your web browser and see something like

```json
{
  "name":"Wallet Attached Storage"
}
```

The `dev` script in this monorepo delegates to the `dev` script in the [nodejs](./nodejs/) subpackage, which runs [server](./server/) using Node.js.

See [./nodejs](./nodejs) for more on wallet-attached-storage-server-nodejs.
