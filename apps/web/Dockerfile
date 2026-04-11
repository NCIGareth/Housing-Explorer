FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install

FROM deps AS build
COPY . .
RUN pnpm --filter @housing/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next ./.next
COPY --from=build /app/apps/web/public ./public
COPY --from=build /app/apps/web/package.json ./package.json
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
