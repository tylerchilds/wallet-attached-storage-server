import type { Fetchable } from "./types"
import type { Database } from 'wallet-attached-storage-database/types'

/**
 * Wallet Attached Storage Server
 */
export class Server implements Fetchable {
  constructor(
    private data: Database
  ) {
  }
  async fetch(request: Request) {
    return Response.json({ message: 'Hello from WAS!' })
  }
}
