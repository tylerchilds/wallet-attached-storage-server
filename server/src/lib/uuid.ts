import {v5 as uuidv5} from "uuid"

export function createUuidV5(options: {
  namespace: Uint8Array
  name: Uint8Array
}): string {
  const { name } = options
  const { namespace } = options
  return uuidv5(name, namespace)
}
