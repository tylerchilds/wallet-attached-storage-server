import { serve } from '@hono/node-server'
import WAS from 'wallet-attached-storage-server'

const { fetch } = new WAS.Server()
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0
const server = serve({
  fetch,
  port
}, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
