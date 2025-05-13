import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
app.get('/', (c) => c.text('Hono meets Node.js'))

const portEnvironmentVariable = process.env.PORT
const port = portEnvironmentVariable ? parseInt(portEnvironmentVariable, 10) : 0

serve({ ...app, port }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`) // Listening on http://localhost:3000
})
