# wallet-attached-storage-server

## 0.1.0

### Minor Changes

- 444361e: server: can construct with options.cors to configure CORS behavior
- f3cf12a: add route for PUT /space/:uuid that handles requests to updat e a space
- 6ed3d81: GET /spaces/:uuid checks request authorization. If there is not sufficient authorizaiton to access the space (and even if that's because there is no known space with that uuid), the response status code is now 401
