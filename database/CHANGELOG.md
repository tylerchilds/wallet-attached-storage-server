# wallet-attached-storage-database

## 0.4.0

### Minor Changes

- ab150e3: GET /space/:uuid with header accept: application/x-tar responds with tar archive

## 0.3.0

### Minor Changes

- eddda21: SpaceRepository#getById,toArray left join to link table to result includes Space#link
- 88cd73e: Add support for postgresql

  This was a bit more involved than expected, because afaict sqlite3 and postgresql do not have any common data type for storing blobs. UUID data types and querything them is also slightly different. Where necessary, Kysely supports introspection such that the wallet-attached-storage-database modules can detect whether the database is backed by sqlite3 or postgresql and adjust behavior accordingly.

- eddda21: Add link table to store links between resources. There is a new migration to add it.
- 5d21396: Add ResourceRepository#deleteById
- 88cd73e: SpaceRepository detects sqlite vs postgresql and queries blob types in a way that should work for both
- eddda21: SpaceRepository#create,put: both persist space.link to link table

## 0.2.0

### Minor Changes

- f730ec6: add wallet-attached-storage-database/space-repository export
- f730ec6: SpaceRepository#getById throws SpaceNotFound when unable to get a space

## 0.1.0

### Minor Changes

- f3cf12a: add SpaceRepository#put to update a space

### Patch Changes

- f3cf12a: Fix ResourceRepository#iterateSpaceNamedRepresentations did not limit underlying db query to correct space name
