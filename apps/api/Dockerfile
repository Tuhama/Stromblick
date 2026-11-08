# syntax=docker/dockerfile:1

# The API's container image. Build from the repo root:
#   docker build -f apps/api/Dockerfile -t stromblick-api .

FROM node:26-alpine AS base
# Prisma's migration engine needs OpenSSL, which Alpine doesn't include.
RUN apk add --no-cache openssl
ENV HUSKY=0

# ---- Build: install the workspace, build the API, collect its production files ----
FROM base AS build
WORKDIR /repo
# Install the pnpm version from package.json's "packageManager". Node 26 no longer ships Corepack.
COPY package.json ./
RUN npm install -g "$(node -p "require('./package.json').packageManager.split('+')[0]")"
# Download dependencies from the lockfile alone, so this layer stays cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @stromblick/api build
# A self-contained folder: dist/, prisma/ and production dependencies only.
# --ignore-scripts: the Prisma client is already bundled into dist/, so don't generate it again.
RUN pnpm --filter @stromblick/api deploy --prod --ignore-scripts /out

# ---- Runtime: only what the API needs to run ----
FROM base
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
# Download Prisma's migration engine into the image, so release migrations don't need a download.
RUN node_modules/.bin/prisma --version
EXPOSE 3001
CMD ["node", "dist/index.js"]