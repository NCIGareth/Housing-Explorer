# System Architecture

This repository operates as a `pnpm` monorepo driven by `turbo`, specifically segmented to maintain clean boundaries between data ingestion, the database layer, and the web frontend.

## 1. Monorepo Map

- **`packages/db`**: The ultimate source of truth for the database. Contains the `schema.prisma`. **Rule**: ALL other packages import the `PrismaClient` directly from `@housing/db`. Never initialize a separate Prisma client in web or ingestion folders.
- **`packages/shared`**: Holds framework-agnostic TypeScript definitions and Zod schemas. Used to pass data safely between the backend APIs, ingestion scripts, and frontend.
- **`packages/ingestion`**: Node.js/TypeScript background jobs. Parses property feeds and CSVs.
  - *Dependency*: Relies on a local Docker `Nominatim` container running on port `8080` for Eircode-to-GPS geocoding without hitting external API rate limits.
- **`apps/web`**: Next.js 15 App Router interface.
  - *Data Access*: Uses React Server Components heavily. Data queries are isolated in `apps/web/lib/queries.ts` and MUST NOT bleed into `page.tsx` rendering functions.
  - *Styling*: Tailwind CSS v4.

## 2. Hard Boundaries for Agents
1. **Never install ORM / DB dependencies inside `apps/web`.** Always update `packages/db` and reference it via standard monorepo workspace imports.
2. **Never place long-running, blocking loops in the Web API routes.** If a background job takes >5 seconds, it belongs in `packages/ingestion` and should be triggered externally.
3. **Always use server actions or `@/lib/queries.ts`** when a user interface component needs to read from the Postgres database. 

## 3. Local Hardware Integrations
- Both NextAuth and database connectivity derive fundamentally from `.env` in the absolute root folder. Wait for Prisma generation using `prisma-with-env.mjs` wrapper in CI/CD chains.
