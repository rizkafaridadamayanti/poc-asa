FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-slim AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY --from=web-build /app/web/dist ./web/dist

ENV PORT=3000
EXPOSE 3000

# Persistent data (auth_session + media) lives on a mounted volume, not a
# Docker VOLUME. On Railway: add a Volume at /data and set AUTH_DIR=/data/auth_session
# and MEDIA_DIR=/data/media_storage.

CMD ["npx", "tsx", "src/index.ts"]
