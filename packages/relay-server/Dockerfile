FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/relay-server/package.json ./packages/relay-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared-types ./packages/shared-types
COPY packages/relay-server ./packages/relay-server

# Build
RUN pnpm --filter @merge/shared-types build
RUN pnpm --filter @merge/relay-server build

# Production image
FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/relay-server/package.json ./packages/relay-server/
COPY --from=builder /app/packages/relay-server/dist ./packages/relay-server/dist

RUN pnpm install --prod --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["node", "packages/relay-server/dist/main.js"]
