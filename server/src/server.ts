import type { Fetchable } from "./types"

/**
 * Wallet Attached Storage Server
 */
export class Server implements Fetchable {
  async fetch(request: Request) {
    return Response.json({ message: 'Hello from WAS!' })
  }
}
