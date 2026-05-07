# System Architecture

This repository operates as a `pnpm` monorepo driven by `turbo`, specifically segmented to maintain clean boundaries between data ingestion, the database layer, and the web frontend.

## 1. Monorepo Map

- **`packages/db`**: The ultimate source of truth for the database. Contains the `schema.prisma`. **Rule**: ALL other packages import the `PrismaClient` directly from `@housing/db`.
- **`packages/shared`**: Holds framework-agnostic TypeScript definitions and Zod schemas.
- **`packages/ingestion`**: Node.js/TypeScript background jobs. Parses property feeds and CSVs.
  - *Self-Healing Layer*: Scripts automatically provision PostGIS extensions and reference tables (`VerifiedEircodeMap`, `internal_geo_reference`) if they are missing.
- **`apps/web`**: Next.js 15 App Router interface.
  - *Data Access*: Uses React Server Components heavily. Data queries are isolated in `apps/web/lib/queries.ts`.
  - *Streaming*: Pages use `Suspense` boundaries with skeleton fallbacks for progressive rendering.
  - *Caching*: Server-rendered on every request (`force-dynamic`). Home page and sale detail pages avoid stale data issues from build-time caching.
  - *Client Pages*: Account pages (`/account/alerts`, `/account/favourites`, `/account/profile`) are client components with `"use client"`.
  - *Data Export*: CSV download via `/api/export` (up to 10,000 records).
  - *Testing*: Jest via `next/jest` configuration. Tests in `apps/web/__tests__/` and `apps/web/components/__tests__/`.

## 2. Data Integrity & Normalization
The ingestion pipeline enforces strict data cleaning:
- **Normalization**: Abbreviations (Rd, Sq, Ave) are expanded to full words.
- **Proper Case**: All-caps addresses are converted to CamelCase for readability.
- **Spatial Fallbacks**: Heuristic estimation (based on Routing Keys) is used when exact geocoding is unavailable.

## 3. Connectivity Strategy
- **Direct Mode**: For large-scale ingestion (750k+ rows), we bypass the Supabase Pooler (Port 6543) and connect directly to **Port 5432**. This eliminates pooler timeouts and schema visibility lag.

## 4. Testing Strategy
- **`@housing/web`**: Jest with `next/jest` — focuses on business logic, external link generators, and component rendering.
- **`@housing/shared`**: Vitest — focuses on Zod schema validation edge cases.
- **`@housing/ingestion`**: Vitest — focuses on data quality, geocoding heuristics, and CSV column detection.
- **`@housing/db`**: Vitest — Prisma client initialization verification.
- **Total**: 143 tests across 10 test files.

## 5. Authentication Layer

Auth uses **next-auth v4** with the JWT strategy (no database adapter):

- **CredentialsProvider** (email + password) with bcryptjs (12 salt rounds) for password hashing
- **Sign-up**: POST `/api/auth/signup` validates with Zod, hashes password, creates user in Prisma
- **Sign-in**: next-auth's built-in credentials callback at `/api/auth/callback/credentials`
- **Session**: JWT stored in httpOnly cookie; `getServerSession(authOptions)` for server-side auth, `useSession()` for client-side
- **Middleware**: Edge middleware at `middleware.ts` protects `/api/alerts/*` routes with JWT token check
- **UI**: Custom sign-in page at `/auth/signin`, sign-up page at `/auth/signup`
- **Password minimum**: 8 characters
- **No email verification**: Omitted due to free-tier constraints (no SMTP)
- **Demo credentials**: `demo@housing.local` / `demo123` (seeded in DB)

Key files:
- `apps/web/lib/auth.ts` — NextAuthOptions config (providers, callbacks, pages)
- `apps/web/middleware.ts` — Edge route protection
- `apps/web/components/auth-provider.tsx` — SessionProvider wrapper for React tree
- `apps/web/types/next-auth.d.ts` — TypeScript type augmentations
- `apps/web/app/api/auth/profile/route.ts` — PATCH endpoint for name/password changes

### Account Pages

| Route | Purpose | Component |
|-------|---------|-----------|
| `/account/alerts` | Manage saved searches and alerts | Client component with create/delete |
| `/account/favourites` | View saved property bookmarks | Client component with remove |
| `/account/profile` | Update name and password | Client form, PATCH to `/api/auth/profile` |

### Saved Properties (FavouriteProperty)

Model stored in Prisma as a join table between `User` and `PropertySale`:
- `apps/web/app/api/favourites/route.ts` — GET (list), POST (add), DELETE (remove)
- `apps/web/components/save-property-button.tsx` — Client component on sale detail page
- Unique constraint on `(userId, propertyId)` prevents duplicates

### Data Export

- `apps/web/app/api/export/route.ts` — GET endpoint, accepts same filter params as dashboard
- Returns `text/csv` with `Content-Disposition: attachment`
- No auth required (public data)

## 6. Hard Boundaries for Agents
1. **Never install ORM / DB dependencies inside `apps/web`.** Always update `packages/db`.
2. **Always use server actions or `@/lib/queries.ts`** when a user interface component needs to read from the Postgres database. 
3. **Keep code edits focused** into single files to stay within the 16k token context window.
