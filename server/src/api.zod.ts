import { z } from 'zod'

// body of POST /spaces/
export const CreateSpaceRequest = z.object({
  controller: z.string().optional(),
  name: z.string().optional(),
  uuid: z.string().optional(),
})

// body of response to POST /spaces/
export const GetSpaceResponse = z.object({
  uuid: z.string(),
  name: z.string().or(z.null()).optional(),
  controller: z.string().or(z.null()).optional(),
})
