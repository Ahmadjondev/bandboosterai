##############################
# Install dependencies
##############################
FROM node:20-alpine AS deps

WORKDIR /app

# install pnpm globally (stable)
RUN npm install -g pnpm

# Build-time environment
ARG NEXT_PUBLIC_API_URL=http://backend:8001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

COPY frontend/package.json frontend/pnpm-lock.yaml ./
## NOTE: ``COPY frontend/.npmrc ./ || true`` is invalid in Dockerfile — shell operators are not supported
## and COPY will fail when file is not present. Some projects add a private `.npmrc` in the
## frontend/ directory for registry auth. We need builds to succeed even when the file is
## absent. Add `.npmrc` to `frontend/` in your repo if you rely on a private registry.

## If you don't have a `.npmrc`, write a safe default that points to public registry.
## This avoids failing builds caused by an absent `.npmrc` file.
RUN echo "registry=https://registry.npmjs.org/" > .npmrc

RUN pnpm install --frozen-lockfile


##############################
# Builder
##############################
FROM node:20-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY frontend .

# copy deps from previous layer
COPY --from=deps /app/node_modules ./node_modules

RUN pnpm build


##############################
# Runner
##############################
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3000
CMD ["pnpm", "start"]
