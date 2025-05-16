import { test } from 'node:test'
import {v5 as uuidv5} from "uuid"
import assert from 'node:assert'

function createUuidV5(options: {
  namespace: Uint8Array
  name: Uint8Array
}): string {
  const { name } = options
  const { namespace } = options
  return uuidv5(name, namespace)
}

await test('generate uuid from space representation', async t => {
  const spaceObject = {
    type: 'Space',
    uuid: 'f3100f08-25ea-49f1-a7dd-0fc745347c61',
  }
  const spaceBytes = new TextEncoder().encode(JSON.stringify(spaceObject))
  const cuuid = createUuidV5({
    namespace: Uint8Array.from([]),
    name: spaceBytes,
  })
  assert.equal(cuuid, '8735f110-f807-5065-864e-29d5533b0add')
})
