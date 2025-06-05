# wallet-attached-storage-server-example-hono-node-server

## 0.1.0

### Minor Changes

- 88cd73e: Add support for postgresql

  This was a bit more involved than expected, because afaict sqlite3 and postgresql do not have any common data type for storing blobs. UUID data types and querything them is also slightly different. Where necessary, Kysely supports introspection such that the wallet-attached-storage-database modules can detect whether the database is backed by sqlite3 or postgresql and adjust behavior accordingly.

### Patch Changes

- Updated dependencies [eddda21]
- Updated dependencies [88cd73e]
- Updated dependencies [78d7e08]
- Updated dependencies [5d21396]
- Updated dependencies [eddda21]
- Updated dependencies [eddda21]
- Updated dependencies [b2fa0c6]
- Updated dependencies [5d21396]
- Updated dependencies [b2fa0c6]
- Updated dependencies [b2fa0c6]
- Updated dependencies [47e70f7]
- Updated dependencies [88cd73e]
- Updated dependencies [eddda21]
- Updated dependencies [b2fa0c6]
  - wallet-attached-storage-database@0.3.0
  - wallet-attached-storage-server@0.3.0
