import { describe, test } from 'node:test'
import assert from "assert"
import { createDatabaseFromSqlite3Url } from '../sqlite3/database-url-sqlite3.ts'
import { initializeDatabaseSchema } from "../schema.ts"
import SpaceRepository from '../space-repository.ts'
import ResourceRepository from '../resource-repository.ts'
import type { Database, ISpace } from '../types.ts'
import { collect } from 'streaming-iterables'
import tar from "tar-stream"
import { Readable, Writable } from 'stream'
import { blob } from 'stream/consumers'

await test(`can export database as tar`, async t => {
  // setup database
  let database: Database
  {
    database = createDatabaseFromSqlite3Url(`sqlite3::memory:`)
    await initializeDatabaseSchema(database)
  }
  // create a space
  let createdSpace: ISpace
  {
    const spaceToCreate = {
      name: 'test-space',
      uuid: crypto.randomUUID(),
      controller: null,
      link: null,
    }
    await new SpaceRepository(database).create(spaceToCreate);
    createdSpace = spaceToCreate
  }
  // add resources to space
  const resourcesToAdd = Object.entries({
    'resource1': new Blob(['resource1 content'], { type: 'text/plain' }),
  })
  {
    for (const [name, representation] of resourcesToAdd) {
      await new ResourceRepository(database).putSpaceNamedResource({
        space: createdSpace.uuid,
        name,
        representation,
      })
    }
  }
  // export space as tar
  let exportedTarStream: ReadableStream
  {
    const exported = await exportSpaceAsTar(database, createdSpace.uuid)
    assert.ok(exported, `result of exportSpaceAsTar must be truthy`)
    exportedTarStream = exported
  }
  // verify exported tar
  {
    const files = await collect(readFilesFromTar(exportedTarStream))
    assert.equal(files.length, resourcesToAdd.length,
      `expected ${resourcesToAdd.length} files in tar, got ${files.length}`)
    assert.ok(files.some(f => f.type === `text/plain`),
      `encoding/decoding preserves media type`)
  }
})

async function exportSpaceAsTar(database: Database, spaceUuid: string): Promise<ReadableStream> {
  const pack = tar.pack()

  // pack should contain a directory named after the space uuid
  pack.entry({ name: spaceUuid, type: 'directory', })

  const resourceRepo = new ResourceRepository(database)
  const repsInSpace = resourceRepo.iterateSpaceNamedRepresentations({
    space: spaceUuid,
  })

  // create entry files for each resource in space
  for await (const rep of repsInSpace) {
    const searchParams = rep.blob.type ? new URLSearchParams({ct:rep.blob.type.toLowerCase()}) : undefined
    const fileName = `${rep.blob.name}${searchParams ? `?${searchParams}` : ''}`
    const tarEntryName = `${spaceUuid}/${encodeURIComponent(fileName)}`
    pack.entry(
      { name: tarEntryName },
      // @todo dont load whole blob into memory
      Buffer.from(await rep.blob.arrayBuffer())
    );
  }
  pack.finalize()
  const t = new TransformStream();
  (Readable.toWeb(pack) as ReadableStream).pipeThrough(t);
  return t.readable
}

function readFilesFromTar(stream: ReadableStream) {
  const extract = tar.extract()
  const files = new ReadableStream<File>({
    start(controller) {
      extract.on('entry', (header, stream, next) => {
        blob(stream).then(async blob => {
          switch (header.type) {
            case 'file':
              const name = header.name
              const nameParts = name.split('/').map(decodeURIComponent)
              const entryFileName = nameParts.at(-1)
              const entryFileNameCt = new URLSearchParams(entryFileName?.replace(/^[^?]+/,'')).get('ct') || undefined
              controller.enqueue(new File([await blob.arrayBuffer()], header.name, { type: entryFileNameCt }))
              break;
            case 'directory':
              break; // no need to make a File for directories
            default:
              console.warn('unsupported tar entry type', header.type, 'for entry', header.name)
              throw new Error(`Unsupported tar entry type: ${header.type} for entry ${header.name}`);
          }
          next()
        })
      })
      extract.on('finish', () => {
        controller.close()
      })
      stream.pipeTo(Writable.toWeb(extract))
    }
  })

  return files;
}