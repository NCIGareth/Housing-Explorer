# API Documentation

This document provides detailed specifications for the Ireland Housing Explorer API endpoints.

## Base URL

All API endpoints are relative to the application base URL.

## Authentication

The API uses **Supabase Auth** (email/password). Sessions are managed via Supabase's `sb-*-auth-token` cookie set by `@supabase/ssr`.

### How auth works:

1. **Sign up** via `supabase.auth.signUp()` (client-side form at `/auth/signup`)
2. **Sign in** via `supabase.auth.signInWithPassword()` (client-side form at `/auth/signin`)
3. **Session** is available via `useUser()` hook from `auth-provider.tsx` (client) or `supabase.auth.getUser()` server helper (server)
4. **Sign out** via `supabase.auth.signOut()`

Protected API routes (e.g. `/api/alerts`, `/api/saved-searches`) use a shared `getAuthUser()` helper that calls `supabase.auth.getUser()`. A middleware layer also blocks unauthenticated requests to `/api/alerts/*`, `/api/favourites/*`, and `/api/saved-searches/*` at the edge.

A DB trigger (`handle_new_user()`) syncs `auth.users` → `public.User` on signup.

## Endpoints

### Health Check

#### GET /api/health

Provides system health status and basic metrics.

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.5,
  "database": {
    "status": "connected",
    "activeListings": 150,
    "historicalRecords": 5000,
    "users": 25
  },
  "ingestion": {
    "lastSuccessfulRun": {
      "source": "PPR",
      "finishedAt": "2024-01-01T00:00:00.000Z",
      "rowsProcessed": 50
    },
    "lastFailedRun": null,
    "recentRuns": [
      {
        "source": "PPR",
        "status": "SUCCESS",
        "startedAt": "2024-01-01T00:00:00.000Z",
        "duration": 45.2
      }
    ]
  }
}
```

**Response (503 - Unhealthy):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "error": "Database connection failed"
}
```

### Search

#### GET /api/search?q=

Full-text search across Property Price Register records.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (min 2 characters) |

**Example:** `GET /api/search?q=D02`

**Response (200):**
```json
[
  {
    "id": "cm7f3...",
    "address": "42 MAIN STREET",
    "county": "Dublin",
    "eircode": "D02X285",
    "priceEur": 450000,
    "saleDate": "2024-01-15T00:00:00.000Z"
  }
]
```

**Notes:**
- Searches across `address`, `eircode`, and `estimatedEircode` using case-insensitive ILIKE
- Results ordered by `saleDate DESC`, limited to 20
- Returns 400 if query is less than 2 characters
- Returns 429 with `Retry-After: 60` if rate limited (30 req/min per IP)

---

### Sign Up / Sign In

Sign-up and sign-in are handled by client-side forms at `/auth/signup` and `/auth/signin` that call Supabase Auth directly:

- **Sign up**: `supabase.auth.signUp({ email, password, options: { data: { name } } })`
- **Sign in**: `supabase.auth.signInWithPassword({ email, password })`

No server-side API routes are used for authentication. Supabase manages session cookies automatically via `@supabase/ssr`.

### Saved Searches

#### GET /api/saved-searches

Retrieve user's saved searches.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Maximum number of results (default: 100)

**Response (200):**
```json
{
  "items": [
    {
      "id": "search_123",
      "userId": "user_123",
      "name": "Dublin Apartments",
      "county": "Dublin",
      "minPriceEur": 300000,
      "maxPriceEur": 600000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/saved-searches

Create a new saved search.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "My Search",
  "county": "Dublin",
  "minPriceEur": 250000,
  "maxPriceEur": 500000
}
```

**Response (201):**
```json
{
  "item": {
    "id": "search_456",
    "userId": "user_123",
    "name": "My Search",
    "county": "Dublin",
    "minPriceEur": 250000,
    "maxPriceEur": 500000,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE /api/saved-searches

Delete a saved search (and its associated alerts).

**Authentication:** Required

**Request Body:**
```json
{
  "id": "search_456"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### Favourites

#### GET /api/favourites

Retrieve user's saved/favourite properties.

**Authentication:** Required

**Response (200):**
```json
{
  "items": [
    {
      "id": "fav_123",
      "userId": "user_123",
      "propertyId": "prop_456",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "property": {
        "id": "prop_456",
        "address": "42 MAIN STREET",
        "county": "Dublin",
        "priceEur": 450000,
        "saleDate": "2024-01-15T00:00:00.000Z",
        "eircode": "D02X285",
        "descriptionOfProperty": "Second-Hand Dwelling house /Apartment"
      }
    }
  ]
}
```

#### POST /api/favourites

Save a property to favourites.

**Authentication:** Required

**Request Body:**
```json
{
  "propertyId": "prop_456"
}
```

**Response (201):**
```json
{
  "item": {
    "id": "fav_123",
    "userId": "user_123",
    "propertyId": "prop_456",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE /api/favourites

Remove a property from favourites.

**Authentication:** Required

**Request Body:**
```json
{
  "propertyId": "prop_456"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### Profile

#### PATCH /api/auth/profile

Update user name and/or password.

**Authentication:** Required

**Request Body (name only):**
```json
{
  "name": "New Name"
}
```

**Request Body (password change):**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### Export

#### GET /api/export

Download property sale records as CSV.

**Authentication:** Not required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `county` | string | Filter by county |
| `minPriceEur` | number | Minimum price |
| `maxPriceEur` | number | Maximum price |
| `startDate` | string | Earliest sale date (ISO) |
| `endDate` | string | Latest sale date (ISO) |

**Response (200):** CSV file download with `Content-Disposition: attachment`

### Alerts

#### GET /api/alerts

Retrieve user's alerts.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Maximum number of results (default: 100)

**Response (200):**
```json
{
  "items": [
    {
      "id": "alert_123",
      "userId": "user_123",
      "savedSearchId": "search_123",
      "type": "NEW_LISTING_MATCH",
      "enabled": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastTriggeredAt": null
    }
  ]
}
```

#### POST /api/alerts

Create a new alert.

**Authentication:** Required

**Request Body:**
```json
{
  "savedSearchId": "search_123",
  "type": "NEW_LISTING_MATCH"
}
```

**Response (201):**
```json
{
  "alert": {
    "id": "alert_456",
    "userId": "user_123",
    "savedSearchId": "search_123",
    "type": "NEW_LISTING_MATCH",
    "enabled": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastTriggeredAt": null
  }
}
```

#### PATCH /api/alerts

Send a preview email for an alert (used for testing).

**Authentication:** Required

**Request Body:**
```json
{
  "alertId": "alert_123",
  "previewMessage": "Test alert message"
}
```

**Response (200):**
```json
{
  "updated": {
    "id": "alert_123",
    "lastTriggeredAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/alerts/dispatch

Manually trigger alert dispatch for all active alerts.

**Authentication:** Required (admin)

**Response (200):**
```json
{
  "sent": 5
}
```

#### DELETE /api/alerts

Delete an alert.

**Authentication:** Required

**Request Body:**
```json
{
  "id": "alert_123"
}
```

**Response (200):**
```json
{
  "success": true
}
```

## Data Types

### Alert Types

- `NEW_LISTING_MATCH`: Triggered when new PPR property sales match saved search criteria

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "details": ["Field 'email' is required"]
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

The search endpoint (`GET /api/search`) is rate limited to 30 requests per minute per IP address. Exceeded requests receive a `429 Too Many Requests` response with a `Retry-After: 60` header. The rate limiter uses an in-memory map with automatic stale-entry cleanup every 5 minutes.

Other API endpoints are not currently rate limited.

## Versioning

The API follows REST conventions. Breaking changes will be communicated in advance with appropriate versioning.