# Next.js Client Directory Structure

```
client/
├── src/
│   ├── app/                      # Next.js 13+ App Router
│   │   ├── (auth)/              # Authentication routes (sign-in, sign-up)
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx
│   │   │   ├── sign-up/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (public)/            # Public routes (landing, about, pricing)
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── pricing/
│   │   │   │   └── page.tsx
│   │   │   ├── features/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (protected)/         # Protected routes (dashboard, trading)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── trading/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── error.tsx
│   │   │   ├── signals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── broker/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── credits/
│   │   │   │       └── page.tsx
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── api/                 # API routes
│   │   │   └── trpc/           # tRPC API handlers
│   │   │
│   │   ├── error.tsx           # Root error page
│   │   ├── loading.tsx         # Root loading page
│   │   └── layout.tsx          # Root layout
│   │
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   │
│   │   ├── auth/              # Authentication components
│   │   │   ├── auth-form.tsx
│   │   │   └── user-button.tsx
│   │   │
│   │   ├── charts/            # Trading chart components
│   │   │   ├── candlestick.tsx
│   │   │   └── indicators.tsx
│   │   │
│   │   ├── trading/           # Trading components
│   │   │   ├── order-form.tsx
│   │   │   └── position-card.tsx
│   │   │
│   │   ├── signals/           # Signal components
│   │   │   ├── signal-card.tsx
│   │   │   └── signal-list.tsx
│   │   │
│   │   └── shared/            # Shared components
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── sidebar.tsx
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-websocket.ts
│   │   ├── use-trades.ts
│   │   └── use-signals.ts
│   │
│   ├── lib/                   # Utility libraries
│   │   ├── utils.ts           # General utilities
│   │   ├── api.ts            # API client
│   │   └── trpc.ts           # tRPC client
│   │
│   ├── styles/               # Global styles
│   │   ├── globals.css
│   │   └── themes/
│   │       ├── dark.css
│   │       └── light.css
│   │
│   ├── types/                # TypeScript types
│   │   ├── api.ts
│   │   ├── trading.ts
│   │   └── signals.ts
│   │
│   └── config/               # Frontend configuration
│       ├── site.ts          # Site metadata
│       └── dashboard.ts     # Dashboard configuration
│
├── public/                   # Static files
│   ├── images/
│   ├── fonts/
│   └── icons/
│
└── tests/                    # Frontend tests
    ├── components/
    └── pages/

```

## Key Features & Organization

### 1. Route Groups & Layouts

- **(auth)**: Authentication-related pages

  - Protected from authenticated users
  - Custom layout for auth pages
  - Clerk components integration

- **(public)**: Public marketing pages

  - Landing page
  - Features showcase
  - Pricing plans
  - About section

- **(protected)**: Authenticated user pages
  - Protected from unauthenticated users
  - Dashboard with real-time data
  - Trading interface
  - Signal management
  - User settings

### 2. Component Organization

- **ui/**: shadcn/ui components

  - Reusable UI components
  - Consistent styling
  - Theme customization

- **Feature-based folders**:

  - auth/: Authentication components
  - charts/: Trading chart components
  - trading/: Trading interface components
  - signals/: Signal management components

- **shared/**: Common components
  - Header with navigation
  - Responsive sidebar
  - Footer

### 3. Data Management

- **hooks/**: Custom React hooks

  - WebSocket connections
  - Data fetching
  - State management

- **lib/**: Utility functions
  - API client setup
  - tRPC configuration
  - Helper functions

### 4. Styling

- **styles/**: Global styles
  - TailwindCSS configuration
  - Theme customization
  - Global CSS variables

### 5. State Management

- **store/**: Zustand stores for global state

  ```
  src/store/
  ├── trading/                # Trading-related state
  │   ├── useTradeStore.ts    # Positions and orders
  │   └── useWatchlistStore.ts # Watchlist management
  ├── signals/               # Signal-related state
  │   ├── useSignalStore.ts  # Active signals
  │   └── useChartStore.ts   # Chart configurations
  ├── user/                 # User-related state
  │   ├── useCreditsStore.ts # Credits management
  │   └── useSettingsStore.ts # User preferences
  └── websocket/            # WebSocket state
      └── useWebSocketStore.ts # Connection management
  ```

- **queries/**: React Query implementations
  ```
  src/queries/
  ├── trading/              # Trading data queries
  │   ├── useTradeQueries.ts  # Trade history
  │   └── usePriceQueries.ts  # Price data
  ├── signals/             # Signal data queries
  │   └── useSignalQueries.ts # Signal history
  └── user/               # User data queries
      └── useUserQueries.ts   # User data and settings
  ```

Example Store Implementation:

```typescript
// src/store/trading/useTradeStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface Position {
  id: string;
  pair: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

interface TradeStore {
  positions: Position[];
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  closePosition: (id: string) => void;
}

export const useTradeStore = create<TradeStore>()(
  devtools(
    persist(
      (set) => ({
        positions: [],
        addPosition: (position) => set((state) => ({ positions: [...state.positions, position] })),
        updatePosition: (id, updates) =>
          set((state) => ({
            positions: state.positions.map((pos) => (pos.id === id ? { ...pos, ...updates } : pos)),
          })),
        closePosition: (id) =>
          set((state) => ({
            positions: state.positions.filter((pos) => pos.id !== id),
          })),
      }),
      { name: "trade-store" }
    )
  )
);
```

Example Query Implementation:

```typescript
// src/queries/trading/useTradeQueries.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTradeStore } from "@/store/trading/useTradeStore";

export function useTradeHistory() {
  return useQuery({
    queryKey: ["trades", "history"],
    queryFn: fetchTradeHistory,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useCreateTrade() {
  const addPosition = useTradeStore((state) => state.addPosition);

  return useMutation({
    mutationFn: createTrade,
    onSuccess: (data) => {
      addPosition(data);
    },
  });
}
```

### Key Features:

1. **Global State Management**

   - Centralized stores for different domains
   - Type-safe state updates
   - Middleware support (devtools, persist)
   - Easy integration with React components

2. **Server State Management**

   - Efficient data fetching
   - Automatic background updates
   - Cache management
   - Optimistic updates

3. **Real-time Updates**

   - WebSocket integration
   - Real-time price updates
   - Position tracking
   - Automatic reconnection

4. **Performance Optimization**
   - Minimal re-renders
   - Efficient caching
   - Selective updates
   - State persistence

## Implementation Notes

1. **Authentication Flow**

```typescript
// app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">{children}</div>
    </div>
  );
}
```

2. **Protected Routes**

```typescript
// app/(protected)/layout.tsx
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

3. **Component Example**

```typescript
// components/trading/order-form.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function OrderForm() {
  return (
    <Card>
      <form className="space-y-4 p-4">{/* Order form fields */}</form>
    </Card>
  );
}
```

## Next Steps

1. **Initial Setup**

   - Create the directory structure
   - Install required dependencies
   - Set up shadcn/ui

2. **Authentication**

   - Configure Clerk
   - Create auth layouts
   - Implement protected routes

3. **Core Features**
   - Build dashboard layout
   - Create trading interface
   - Implement real-time updates

Would you like me to:

1. Create this directory structure?
2. Start implementing any specific part?
3. Set up the initial configuration?
