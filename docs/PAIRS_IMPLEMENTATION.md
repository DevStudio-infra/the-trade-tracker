# Trading Pairs Implementation Plan

## Database Structure

### Prisma Schema for Capital.com Pairs

```prisma
// In schema.prisma
model CapitalComPair {
  symbol       String   @id
  displayName  String
  type        String
  category    String
  minQuantity Decimal? @db.Decimal(10, 5)
  maxQuantity Decimal? @db.Decimal(10, 5)
  precision   Int?
  isActive    Boolean  @default(true)
  lastUpdated DateTime @default(now()) @updatedAt

  @@index([category])
  @@index([type])
  @@map("capital_com_pairs")
}
```

## Implementation Steps

### 1. Initial Data Population

- [x] Add CapitalComPair model to Prisma schema
- [ ] Generate and run Prisma migration
- [x] Create script to fetch initial data from Capital.com API:

  ```typescript
  // In src/scripts/populate-capital-pairs.ts
  import { PrismaClient } from "@prisma/client";

  const prisma = new PrismaClient();

  const categories = {
    FOREX: "hierarchy_v1.forex_group",
    CRYPTOCURRENCIES: "hierarchy_v1.crypto_group",
    SHARES: "hierarchy_v1.shares_group",
    INDICES: "hierarchy_v1.indices_group",
    COMMODITIES: "hierarchy_v1.commodities_group",
  };

  async function populateCapitalPairs() {
    for (const [category, nodeId] of Object.entries(categories)) {
      // 1. Get market navigation data
      const markets = await api.getMarketNavigation(nodeId);

      // 2. Get market details in batches
      for (const batch of chunks(markets.nodes, 10)) {
        const pairs = await api.getMarketDetails(batch.map((n) => n.id).join(","));

        // 3. Store in database using Prisma
        await prisma.capitalComPair.createMany({
          data: pairs.map((pair) => ({
            symbol: pair.symbol,
            displayName: pair.displayName,
            type: pair.type,
            category,
            minQuantity: pair.minQuantity,
            maxQuantity: pair.maxQuantity,
            precision: pair.precision,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
  ```

### 2. Redis Cache Setup

- [x] Set up Redis connection and configuration
- [x] Define cache keys structure:
  ```
  capital:pairs:{category} -> Array of pairs for specific category
  capital:pairs:all -> All pairs (for search functionality)
  ```
- [x] Set 30-day expiration for cache entries

### 3. API Endpoints

- [x] Create Prisma service for pairs:

  ```typescript
  // In src/services/cache/pairs-cache.service.ts
  export class PairsCacheService {
    constructor(private prisma: PrismaClient) {}

    async getPairsByCategory(category: string) {
      return this.prisma.capitalComPair.findMany({
        where: { category, isActive: true },
        orderBy: { displayName: "asc" },
      });
    }

    async searchPairs(query: string) {
      return this.prisma.capitalComPair.findMany({
        where: {
          AND: [
            { isActive: true },
            {
              OR: [{ symbol: { contains: query, mode: "insensitive" } }, { displayName: { contains: query, mode: "insensitive" } }],
            },
          ],
        },
        orderBy: { displayName: "asc" },
      });
    }
  }
  ```

### 4. Monthly Validation Service

- [x] Create validation service:

  ```typescript
  // In src/services/validation/capital-pairs-validation.service.ts
  export class CapitalPairsValidationService {
    constructor(private prisma: PrismaClient, private cacheService: PairsCacheService) {}

    // Run monthly
    async validatePairs() {
      for (const category of Object.keys(categories)) {
        await this.validateCategory(category);
      }
    }

    // Validate single category
    async validateCategory(category: string) {
      const nodeId = categories[category];
      const markets = await api.getMarketNavigation(nodeId);

      // Fetch current pairs from API in batches
      for (const batch of chunks(markets.nodes, 10)) {
        const newPairs = await api.getMarketDetails(batch.map((n) => n.id).join(","));

        // Update using Prisma transactions
        await this.prisma.$transaction(async (tx) => {
          for (const pair of newPairs) {
            await tx.capitalComPair.upsert({
              where: { symbol: pair.symbol },
              create: {
                symbol: pair.symbol,
                displayName: pair.displayName,
                type: pair.type,
                category,
                minQuantity: pair.minQuantity,
                maxQuantity: pair.maxQuantity,
                precision: pair.precision,
              },
              update: {
                displayName: pair.displayName,
                type: pair.type,
                minQuantity: pair.minQuantity,
                maxQuantity: pair.maxQuantity,
                precision: pair.precision,
              },
            });
          }
        });
      }

      // Refresh cache after update
      await this.cacheService.refreshCategory(category);
    }
  }
  ```

### 5. Cache Management

- [x] Create cache service:

  ```typescript
  // In src/services/cache/pairs-cache.service.ts
  export class PairsCacheService {
    constructor(private prisma: PrismaClient, private redis: Redis) {}

    async getPairs(category: string) {
      const cacheKey = `capital:pairs:${category}`;

      // Try Redis first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Cache miss - get from Prisma
      const pairs = await this.prisma.capitalComPair.findMany({
        where: { category, isActive: true },
      });

      // Update cache
      await this.redis.set(
        cacheKey,
        JSON.stringify(pairs),
        "EX",
        30 * 24 * 60 * 60 // 30 days
      );

      return pairs;
    }

    async refreshCategory(category: string) {
      const pairs = await this.prisma.capitalComPair.findMany({
        where: { category, isActive: true },
      });

      await this.redis.set(`capital:pairs:${category}`, JSON.stringify(pairs), "EX", 30 * 24 * 60 * 60);
    }
  }
  ```

## Data Flow

1. **Normal Operation**

   ```
   Client Request -> Redis Cache -> Response
   ```

2. **Cache Miss**

   ```
   Client Request -> Redis Cache (miss) -> Prisma Query -> Update Cache -> Response
   ```

3. **Monthly Validation**
   ```
   Cron Job -> Capital.com API -> Prisma Upsert -> Refresh Cache
   ```

## Implementation Priorities

1. **Phase 1: Basic Setup**

- [x] Add Prisma schema and generate client
- [ ] Run migrations
- [x] Initial data population script
- [x] Basic API endpoints without cache

2. **Phase 2: Caching**

- [x] Redis setup
- [x] Cache service implementation
- [x] Update API endpoints to use cache

3. **Phase 3: Validation**

- [x] Monthly validation service
- [x] Monitoring and logging
- [x] Error handling and notifications

4. **Phase 4: Optimization**

- [x] Fine-tune cache duration
- [ ] Add performance monitoring
- [ ] Implement rate limiting

## Notes

- Use Prisma's transaction API for atomic operations
- Keep all Capital.com specific logic in dedicated services
- Log significant changes for monitoring
- Focus on stability over real-time updates
- Cache entire categories rather than individual pairs
- Use batch operations where possible
- Implement proper error handling and fallbacks

## Future Considerations

- Add support for other brokers (extend Prisma schema)
- Implement cache warming after system restart
- Add analytics for pair usage
- Consider shorter validation intervals for specific categories
