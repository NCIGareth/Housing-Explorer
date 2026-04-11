# API Documentation

This document provides detailed specifications for the Ireland Housing Explorer API endpoints.

## Base URL

All API endpoints are relative to the application base URL.

## Authentication

The API uses NextAuth.js for authentication. Include authentication tokens in requests where required.

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

### Authentication

#### POST /api/auth/signin

Sign in with email credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": null
  },
  "expires": "2024-01-01T12:00:00.000Z"
}
```

#### GET /api/auth/session

Get current user session information.

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": null
  },
  "expires": "2024-01-01T12:00:00.000Z"
}
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
  "userId": "user_123",
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

**Authentication:** Required

**Response (200):**
```json
{
  "sent": 5
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