import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import WAS from 'wallet-attached-storage-server'

const app = new Hono().mount('/', new WAS.Server().fetch)

const portEnvironmentVariable = process.env.PORT
const port = portEnvironmentVariable ? parseInt(portEnvironmentVariable, 10) : 0

serve({ ...app, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`) // Listening on http://localhost:3000
})
