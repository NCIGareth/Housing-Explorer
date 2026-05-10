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
- **DATABASE_URL** (pooler): Used by the app for queries. Points to `pooler.supabase.com:5432` with `?sslmode=require&pgbouncer=true` for Prisma compatibility with transaction-mode pooling.
- **DIRECT_URL** (direct): Used by Prisma Migrate and admin scripts. Points to `db.<ref>.supabase.co:5432` (direct, no pooler) to avoid competing with the app for pooler connections. If the direct host is IPv6-only from your network, use the pooler URL instead.
- **Session limit**: The Supabase pooler has a 15-connection session-mode limit. Admin scripts consuming pool connections can starve the production app — use DIRECT_URL for admin queries.
- **Large-scale ingestion**: Use the direct connection (port 5432, bypassing pooler) to eliminate timeouts and schema visibility lag.

## 4. Testing Strategy
- **`@housing/web`**: Jest with `next/jest` — focuses on business logic, external link generators, and component rendering.
- **`@housing/shared`**: Vitest — focuses on Zod schema validation edge cases.
- **`@housing/ingestion`**: Vitest — focuses on data quality, geocoding heuristics, and CSV column detection.
- **`@housing/db`**: Vitest — Prisma client initialization verification.
- **Total**: 154 tests across 9 test files.

## 5. Authentication Layer

Auth uses **Supabase Auth** (email/password). Supabase manages password hashing, session cookies, and token refresh automatically.

- **Sign-up**: Client-side `supabase.auth.signUp({ email, password, options: { data: { name } } })` at `/auth/signup`
- **Sign-in**: Client-side `supabase.auth.signInWithPassword({ email, password })` at `/auth/signin`
- **Session**: Managed via `sb-*-auth-token` cookie set by `@supabase/ssr`
- **Server auth**: `supabase.auth.getUser()` via `@/lib/supabase/server` — used in all API routes via shared `getAuthUser()` helper
- **Client auth**: Custom React context (`auth-provider.tsx`) with `useUser()` hook, listens to `onAuthStateChange`
- **Middleware**: Edge middleware at `middleware.ts` protects `/api/alerts/*`, `/api/favourites/*`, `/api/saved-searches/*` using Supabase session
- **DB sync**: A `handle_new_user()` trigger on `auth.users` auto-creates a `public.User` row on signup
- **Profile updates**: PATCH `/api/auth/profile` uses Supabase `getUser()` for auth and `supabase.auth.updateUser()` for updates
- **No email verification**: Omitted due to free-tier constraints (no SMTP)

Key files:
- `apps/web/lib/supabase/client.ts` — Browser Supabase client
- `apps/web/lib/supabase/server.ts` — Server Supabase client for API routes
- `apps/web/lib/supabase/middleware.ts` — Edge middleware Supabase client
- `apps/web/middleware.ts` — Edge route protection
- `apps/web/components/auth-provider.tsx` — Supabase session context + `useUser()` hook
- `apps/web/app/auth/signin/page.tsx` — Sign-in form
- `apps/web/app/auth/signup/page.tsx` — Sign-up form
- `apps/web/app/api/auth/profile/route.ts` — PATCH endpoint for name/password changes
- `supabase/auth-sync.sql` — DB trigger and pg_cron setup

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
