import type { IWalletAttachedStorageServer } from "./types"

/**
 * Wallet Attached Storage Server
 */
export class Server implements IWalletAttachedStorageServer {
  async fetch() {
    return Response.json({ message: 'Hello from WAS!' })
  }
}
