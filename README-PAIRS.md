# Trading Pairs Implementation

This document provides instructions on how to use the trading pairs implementation for Capital.com.

## Overview

The implementation provides a robust system for:

- Storing trading pairs in a database
- Caching pairs for fast retrieval
- Automatically validating and updating pairs monthly
- API endpoints for retrieving pairs by category and searching

## Setup Instructions

### 1. Database Setup

The implementation uses Prisma with PostgreSQL. The schema has been added to `server/prisma/schema.prisma`.

To apply the migration:

```bash
cd server
npx prisma migrate dev --name add_capital_pairs
```

### 2. Initial Data Population

To populate the database with initial data from Capital.com:

```bash
cd server
npm run populate-pairs
```

This script will:

- Authenticate with Capital.com API
- Fetch trading pairs for all categories (FOREX, CRYPTOCURRENCIES, SHARES, INDICES, COMMODITIES)
- Store them in the database

### 3. API Usage

The following API endpoints are available:

#### Get All Categories

```
GET /v1/pairs/categories
```

Returns a list of all available categories.

#### Get Pairs by Category

```
GET /v1/pairs/:category
```

Returns all pairs for a specific category (e.g., FOREX, CRYPTOCURRENCIES).

#### Search Pairs

```
GET /v1/pairs/search?q=query
```

Searches for pairs by symbol or display name.

### 4. Automatic Updates

The system includes a monthly validation job that runs on the first day of each month at 2:00 AM UTC. This job:

- Fetches the latest data from Capital.com
- Updates existing pairs
- Adds new pairs
- Refreshes the cache

## Implementation Details

### Caching

- Redis is used for caching
- Cache duration is set to 30 days
- Cache keys follow the pattern: `capital:pairs:{category}`
- Search results are cached for 24 hours with keys: `capital:search:{query}`

### Error Handling

- All API endpoints include proper error handling
- Failed API requests fall back to database queries
- Cache errors are logged but don't interrupt the request flow

### Logging

- All operations are logged using Winston
- Logs include information about cache hits/misses, API requests, and errors

## Troubleshooting

### Cache Issues

If you encounter issues with cached data, you can manually refresh the cache:

```typescript
// In your code
import { PrismaClient } from "@prisma/client";
import { PairsCacheService } from "./services/cache/pairs-cache.service";

const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);

// Refresh a specific category
await pairsCache.refreshCategory("FOREX");

// Or refresh all categories
await pairsCache.refreshAllCategories();
```

### Manual Validation

To manually trigger the validation process:

```typescript
import { PrismaClient } from "@prisma/client";
import { PairsCacheService } from "./services/cache/pairs-cache.service";
import { CapitalPairsValidationService } from "./services/validation/capital-pairs-validation.service";

const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);
const validationService = new CapitalPairsValidationService(prisma, pairsCache);

// Validate all categories
await validationService.validatePairs();

// Or validate a specific category
await validationService.validateCategory("FOREX", "hierarchy_v1.forex_group");
```
