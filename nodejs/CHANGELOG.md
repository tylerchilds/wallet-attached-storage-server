# wallet-attached-storage-server-nodejs

## 0.3.0

### Minor Changes

- 88cd73e: Add support for postgresql

  This was a bit more involved than expected, because afaict sqlite3 and postgresql do not have any common data type for storing blobs. UUID data types and querything them is also slightly different. Where necessary, Kysely supports introspection such that the wallet-attached-storage-database modules can detect whether the database is backed by sqlite3 or postgresql and adjust behavior accordingly.

### Patch Changes

- 88cd73e: migrations/1747304776946_add-space-names.ts detects sqlite3 or postgresql and creates blob columns accordingly
- 88cd73e: the package.json now has a kysely run script that runs kysely-ctl. Use like `npm run kysely -- migrate:list`
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

## 0.2.0

### Minor Changes

- f730ec6: support env TRUST_HEADER_X_FORWARDED_PROTO to trust X-Forwarded-Proto header from http proxies

### Patch Changes

- Updated dependencies [f730ec6]
- Updated dependencies [f730ec6]
- Updated dependencies [f730ec6]
  - wallet-attached-storage-server@0.2.0
  - wallet-attached-storage-database@0.2.0

## 0.1.0

### Minor Changes

- 444361e: nodejs: enable CORS headers configured with CORS_ALLOWED_ORIGINS and CORS_ALLOW_ALL_ORIGINS

### Patch Changes

- Updated dependencies [f3cf12a]
- Updated dependencies [f3cf12a]
- Updated dependencies [444361e]
- Updated dependencies [f3cf12a]
- Updated dependencies [6ed3d81]
  - wallet-attached-storage-database@0.1.0
  - wallet-attached-storage-server@0.1.0
