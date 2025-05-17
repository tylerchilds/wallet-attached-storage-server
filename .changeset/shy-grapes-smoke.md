---
"wallet-attached-storage-server": minor
---

GET /spaces/:uuid checks request authorization. If there is not sufficient authorizaiton to access the space (and even if that's because there is no known space with that uuid), the response status code is now 401
