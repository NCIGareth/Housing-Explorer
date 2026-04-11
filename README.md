# Ireland Housing Explorer

A comprehensive web application for exploring the Irish housing market by comparing historical Central Statistics Office (CSO) data with current property listings from approved data feeds.

## Features

- **Interactive Map**: View current property listings on an interactive Leaflet map
- **Historical Trends**: Compare current market prices with historical CSO data
- **Property Price Register**: Analyze sales data from Ireland's official property register
- **User Authentication**: Secure user accounts with NextAuth.js
- **Saved Searches**: Save and manage property search preferences
- **Email Alerts**: Receive notifications for new listings matching your criteria
- **Advanced Filtering**: Filter by location, price range, property type, and more

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Authentication**: NextAuth.js with email/password
- **Maps**: React-Leaflet for interactive property mapping
- **Charts**: Recharts for data visualization
- **Email**: Nodemailer with MailHog for development
- **Validation**: Zod for type-safe data validation
- **Styling**: CSS-in-JS with responsive design

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ireland-housing-explorer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start infrastructure**
   ```bash
   docker compose up -d
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

6. **Run data ingestion**
   ```bash
   pnpm ingest
   pnpm ingest:ppr
   ```

7. **Start development server**
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to access the application.

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm test` - Run tests

### Database Scripts

- `pnpm db:generate` - Generate Prisma client
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm ingest` - Run data ingestion pipelines
- `pnpm ingest:ppr` - Import Property Price Register data

### Project Structure

```
├── apps/web/                 # Next.js web application
│   ├── app/                  # Next.js 13+ app directory
│   ├── components/           # React components
│   ├── lib/                  # Utility functions and configurations
│   └── public/               # Static assets
├── packages/
│   ├── db/                   # Database schema and client
│   ├── ingestion/            # Data ingestion pipelines
│   └── shared/               # Shared types and validation
├── scripts/                  # Build and utility scripts
└── infra/                    # Infrastructure configuration
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/signin
Sign in with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

#### GET /api/auth/session
Get current user session.

### Property Data Endpoints

#### GET /api/health
Health check endpoint providing system status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
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
    }
  }
}
```

### Saved Searches Endpoints

#### GET /api/saved-searches
Get user's saved searches.

**Response:**
```json
{
  "items": [
    {
      "id": "search_123",
      "name": "Dublin Apartments",
      "county": "Dublin",
      "minPriceEur": 300000,
      "maxPriceEur": 600000,
      "minBeds": 2,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/saved-searches
Create a new saved search.

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

### Alert Endpoints

#### GET /api/alerts
Get user's alerts.

#### POST /api/alerts
Create a new alert.

**Request Body:**
```json
{
  "userId": "user_123",
  "savedSearchId": "search_123",
  "type": "NEW_LISTING_MATCH"
}
```

#### POST /api/alerts/dispatch
Manually trigger alert dispatch for all active alerts.

## Data Sources

### Central Statistics Office (CSO)
Historical residential property price indices by county and time period.

### Approved Listings Feed
Current property listings with location, price, and property details.

### Property Price Register (PPR)
Official record of property sales in Ireland, used for historical analysis.

## Deployment

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/housing"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-secret-key"
EMAIL_FROM="alerts@yourdomain.com"
SMTP_HOST="your-smtp-host"
SMTP_PORT="587"
```

### Production Build

```bash
pnpm build
pnpm start
```

### Docker Deployment

```bash
docker build -f apps/web/Dockerfile -t housing-explorer .
docker run -p 3000:3000 housing-explorer
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `pnpm typecheck` and `pnpm test`
6. Submit a pull request

### Code Quality

- Use TypeScript for all new code
- Follow ESLint configuration
- Add tests for new features
- Update documentation for API changes

## Troubleshooting

### Database Connection Issues

- Ensure Docker containers are running: `docker compose ps`
- Check DATABASE_URL in `.env` file
- Verify PostgreSQL is accessible on port 5432

### Ingestion Failures

- Check logs in `packages/ingestion/src/logger.ts`
- Verify data source URLs in environment variables
- Ensure CSV files are properly formatted for PPR import

### Authentication Issues

- Check NEXTAUTH_SECRET is set
- Verify SMTP configuration for email alerts
- Ensure NEXTAUTH_URL matches your domain

## License

This project is licensed under the MIT License.
