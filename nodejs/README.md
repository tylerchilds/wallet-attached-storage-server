# wallet-attached-storage-server-nodejs

Runs [wallet-attached-storage-server][] in [Node.js][]

## Usage

### Development

Run the `dev` script from [package.json][] `scripts`.

```
npm run dev
```

By default, this will use environment variables from [.env.dev](.env.dev) that configure
* `DATABASE_URL`: sqlite3 in [var/wallet-attached-storage-server.dev.sqlite3](var/wallet-attached-storage-server.dev.sqlite3)
* `PORT`: 8080

Any environment variables you provide should override these, e.g. `PORT=80 npm run dev`

### Production

Run the `start` script from [package.json][] `scripts`.

```
npm run start
```

This will not use the `.env.dev` environment variables.

By default
* If `PORT` environment variable is unset, the server will listen on an open port and log the URL to stdio
* the server will store data in memory with no filesystem persistence. Data will not be retained across server restarts. Set `DATABASE_URL` to configure this (e.g. `DATABASE_URL=/var/wallet-attached-storage-server.sqlite3`).

[Node.js]: https://nodejs.org/en
[wallet-attached-storage-server]: ../server
[package.json]: package.json

## Configuration

### Environment Variables

#### `CORS_ALLOW_ORIGIN`

Origins that will be allowed via Access-Control-Allow-Origin response headers

Default: unset

Constraints
* value SHOULD be a JSON Array of Origin strings

Example: `["https://sillyz.computer"]`

#### `CORS_ALLOW_ALL_ORIGINS`

If truthy, all origins will be allowed via CORS Access-Control-Allow-Origin response headers

Default: unset

Constraints
* If truthy, will be interpreted as `true`

Example: `true`

#### `DATABASE_URL`

URL to connect to with [wallet-attached-storage-database](../database).

Default: `sqlite3::memory:` i.e. a [SQLite In-Memory Database](https://www.sqlite.org/inmemorydb.html)

#### `PORT`

HTTP port that the server will listen on.

Default: `0`

Suggestions:
* `0`: listen on any open port
* `8080`: a port that most users are allowed to listen on
* `80` is a common HTTP port, but may require special privileges to use on your machine

## FAQ

### Why are my requests to wallet-attached-storage-server from a web browser failing with CORS errors?

Add the `Origin` that those requests are coming from to the JSON Array that is the value of `CORS_ALLOW_ORIGIN`.

```
CORS_ALLOW_ORIGIN='["http://localhost:8081"]' npm run dev
```

You may also set `CORS_ALLOW_ALL_ORIGINS` to allow all origins to make CORS requests, but prefer to explicitly allowlist origins via `CORS_ALLOW_ORIGIN`.
