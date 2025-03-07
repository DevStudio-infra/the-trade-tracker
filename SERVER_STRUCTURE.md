# Server Directory Structure

```
server/
├── src/
│   ├── config/                     # Configuration files
│   │   ├── env.config.ts           # Environment configuration
│   │   ├── supabase.config.ts      # Supabase client configuration
│   │   ├── redis.config.ts         # Redis configuration
│   │   ├── stripe.config.ts        # Stripe configuration
│   │   └── ai.config.ts            # AI models configuration
│   │
│   ├── models/                     # Prisma models and types
│   │   ├── generated/              # Prisma generated types
│   │   └── interfaces/             # Custom interfaces and types
│   │
│   ├── services/                   # Business logic services
│   │   ├── auth/                   # Authentication related services
│   │   ├── broker/                 # Broker integration services
│   │   │   ├── interfaces/         # Broker interface definitions
│   │   │   ├── capital-com/        # Capital.com implementation
│   │   │   └── common/            # Shared broker utilities
│   │   ├── ai/                     # AI services
│   │   │   ├── signal-detection/   # Signal detection logic
│   │   │   ├── confirmation/       # Confirmation logic
│   │   │   └── rag/               # RAG implementation
│   │   ├── trading/               # Trading related services
│   │   ├── credits/               # Credit management
│   │   ├── analytics/             # Analytics services
│   │   └── notifications/         # Notification services
│   │
│   ├── routes/                    # API routes
│   │   ├── v1/                    # API version 1
│   │   │   ├── auth.routes.ts
│   │   │   ├── broker.routes.ts
│   │   │   ├── trading.routes.ts
│   │   │   ├── signals.routes.ts
│   │   │   ├── credits.routes.ts
│   │   │   └── analytics.routes.ts
│   │   └── middleware/            # Route middleware
│   │       ├── auth.middleware.ts
│   │       ├── credits.middleware.ts
│   │       └── validation.middleware.ts
│   │
│   ├── utils/                     # Utility functions
│   │   ├── encryption.utils.ts    # Encryption utilities
│   │   ├── chart.utils.ts         # Chart generation utilities
│   │   ├── validation.utils.ts    # Input validation
│   │   └── error.utils.ts         # Error handling
│   │
│   ├── websocket/                 # WebSocket handlers
│   │   ├── handlers/             # WebSocket event handlers
│   │   └── middleware/           # WebSocket middleware
│   │
│   ├── tasks/                     # Background tasks
│   │   ├── candle-updater.ts     # Candle data updates
│   │   └── cleanup.ts            # Cleanup tasks
│   │
│   ├── cache/                     # Cache management
│   │   ├── redis/                # Redis implementations
│   │   └── interfaces/           # Cache interfaces
│   │
│   └── lib/                       # Shared libraries
│       ├── prisma.ts             # Prisma client
│       ├── supabase.ts           # Supabase client
│       └── redis.ts              # Redis client
│
├── prisma/                        # Prisma configuration
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
│
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/             # Integration tests
│   └── fixtures/                # Test fixtures
│
└── docs/                         # Documentation
    ├── api/                      # API documentation
    └── setup/                    # Setup guides
```

## Key Organizational Principles

1. **Separation of Concerns**

   - Each directory has a specific responsibility
   - Clear separation between routes, services, and models
   - Business logic isolated in services

2. **Modularity**

   - Related functionality grouped together
   - Each module can be developed/tested independently
   - Easy to add new features without touching existing code

3. **Scalability**

   - Versioned API routes
   - Separate WebSocket handling
   - Background tasks isolation

4. **Maintainability**

   - Consistent structure across features
   - Clear import paths
   - Easy to locate specific functionality

5. **Testing**
   - Separate test directories for different types of tests
   - Fixtures for test data
   - Easy to mock dependencies

## Import Examples

```typescript
// Service import
import { SignalDetectionService } from "@services/ai/signal-detection";

// Route import
import { brokerRoutes } from "@routes/v1/broker.routes";

// Middleware import
import { validateCredits } from "@routes/middleware/credits.middleware";

// Utility import
import { encryptCredentials } from "@utils/encryption.utils";
```

## Environment Configuration

Create separate configuration files for different environments:

```
config/
├── env.config.ts
├── env.development.ts
├── env.production.ts
└── env.test.ts
```

This structure ensures:

- Easy navigation
- Clear dependencies
- Scalable architecture
- Testable components
- Maintainable codebase
