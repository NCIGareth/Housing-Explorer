# System Architecture

This repository operates as a `pnpm` monorepo driven by `turbo`, specifically segmented to maintain clean boundaries between data ingestion, the database layer, and the web frontend.

## 1. Monorepo Map

- **`packages/db`**: The ultimate source of truth for the database. Contains the `schema.prisma`. **Rule**: ALL other packages import the `PrismaClient` directly from `@housing/db`.
- **`packages/shared`**: Holds framework-agnostic TypeScript definitions and Zod schemas.
- **`packages/ingestion`**: Node.js/TypeScript background jobs. Parses property feeds and CSVs.
  - *Self-Healing Layer*: Scripts automatically provision PostGIS extensions and reference tables (`VerifiedEircodeMap`, `internal_geo_reference`) if they are missing.
- **`apps/web`**: Next.js 15 App Router interface.
  - *Data Access*: Uses React Server Components heavily. Data queries are isolated in `apps/web/lib/queries.ts`.
  - *Pagination*: Implemented via URL query parameters (`page`) with server-side `skip`/`take` logic.

## 2. Data Integrity & Normalization
The ingestion pipeline enforces strict data cleaning:
- **Normalization**: Abbreviations (Rd, Sq, Ave) are expanded to full words.
- **Proper Case**: All-caps addresses are converted to CamelCase for readability.
- **Spatial Fallbacks**: Heuristic estimation (based on Routing Keys) is used when exact geocoding is unavailable.

## 3. Connectivity Strategy
- **Direct Mode**: For large-scale ingestion (750k+ rows), we bypass the Supabase Pooler (Port 6543) and connect directly to **Port 5432**. This eliminates pooler timeouts and schema visibility lag.

## 4. Hard Boundaries for Agents
1. **Never install ORM / DB dependencies inside `apps/web`.** Always update `packages/db`.
2. **Always use server actions or `@/lib/queries.ts`** when a user interface component needs to read from the Postgres database. 
3. **Keep code edits focused** into single files to stay within the 16k token context window.
