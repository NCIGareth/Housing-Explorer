# API Documentation

This document provides detailed specifications for the Ireland Housing Explorer API endpoints.

## Base URL

All API endpoints are relative to the application base URL.

## Authentication

The API uses NextAuth.js with a CredentialsProvider (email + password). Sessions are managed via JWT stored in httpOnly cookies.

### How auth works:

1. **Sign up** at `/auth/signup` (POST to `/api/auth/signup`)
2. **Sign in** at `/auth/signin` (POSTs to `/api/auth/callback/credentials` via next-auth's `signIn()`)
3. **Session** is available via `useSession()` (client) or `getServerSession(authOptions)` (server)
4. **Sign out** via `signOut()` from `next-auth/react`

Protected API routes (e.g. `/api/alerts`, `/api/saved-searches`) use `getServerSession()` to verify authentication. A middleware layer also blocks unauthenticated requests to `/api/alerts/*` at the edge.

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
      "source": "APPROVED_FEED",
      "finishedAt": "2024-01-01T00:00:00.000Z",
      "rowsProcessed": 50
    },
    "lastFailedRun": null,
    "recentRuns": [
      {
        "source": "APPROVED_FEED",
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
- Returns empty array if query is too short or search fails

---

### Sign Up

#### POST /api/auth/signup

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "Your Name",
  "password": "yourpassword"
}
```

**Validation:**
- `email`: valid email format
- `name`: 1-100 characters
- `password`: 8-128 characters

**Response (201):**
```json
{
  "success": true
}
```

**Response (409):**
```json
{
  "error": "A user with this email already exists"
}
```

**Response (400):**
```json
{
  "error": "Invalid input",
  "details": {
    "fieldErrors": { "password": ["String must contain at least 8 character(s)"] },
    "formErrors": []
  }
}
```

### Sign In

Sign-in is handled by next-auth's built-in CredentialsProvider. The client calls `signIn("credentials", { email, password })` from `next-auth/react`, which POSTs to `/api/auth/callback/credentials`. On success, a JWT session cookie is set and the user is redirected.

**Sign-in page:** `/auth/signin`

### Session

#### GET /api/auth/session

Returns the current session (JWT payload). Used internally by `useSession()` and `getServerSession()`.

**Response (200) when authenticated:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "Your Name"
  },
  "expires": "2024-01-01T12:00:00.000Z"
}
```

**Response (200) when unauthenticated:**
```json
{}
```

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
      "minBeds": 2,
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
  "maxPriceEur": 500000,
  "minBeds": 2
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
    "minBeds": 2,
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
  "alerts": [
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
  "userId": "user_123",
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
  "userEmail": "user@example.com",
  "previewMessage": "Test alert message"
}
```

**Response (200):**
```json
{
  "alert": {
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

- `NEW_LISTING_MATCH`: Triggered when new listings match saved search criteria
- `PRICE_DROP`: Triggered when prices drop on existing listings

### Ingestion Sources

- `CSO`: Central Statistics Office historical data
- `APPROVED_FEED`: Current property listings feed
- `PPR`: Property Price Register sales data

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

API endpoints are rate limited to prevent abuse. Limits vary by endpoint and authentication status.

## Versioning

The API follows REST conventions. Breaking changes will be communicated in advance with appropriate versioning.