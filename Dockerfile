# Stage 1: Build
FROM node:24-slim AS builder
RUN apt-get update
# better-sqlite3 dependencies
RUN apt-get install -y build-essential python3 sqlite3 libsqlite3-dev
WORKDIR /app
COPY package*.json ./
COPY database/package.json ./database/package.json
COPY nodejs/package.json ./nodejs/package.json
COPY server/package.json ./server/package.json
COPY examples/hono-node-server/package.json ./examples/hono-node-server/package.json
RUN npm ci --no-audit --no-progress
COPY . .
RUN npm run --if-present build
RUN ls -la .

# Stage 2: Runtime
FROM node:24-slim
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/database ./database
COPY --from=builder /app/nodejs ./nodejs
COPY --from=builder /app/server ./server
COPY --from=builder /app/examples ./examples
COPY --from=builder /app/package-lock.json ./
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
