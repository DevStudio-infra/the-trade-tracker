# Chart Refactoring Project

## Overview

This project refactors the trading chart system to improve maintainability, performance, and extensibility. The system has been rebuilt with a robust, type-safe architecture that allows for easy addition of new indicators and chart features.

## Core Architecture

The architecture is structured around the following components:

1. **Core Types and Utilities**

   - `ChartTypes.ts`: Defines all type interfaces for chart components
   - `ChartUtils.ts`: Utilities for pane management and other chart operations

2. **Indicator System**

   - Base interface and abstract class that all indicators extend
   - Clear separation between calculation logic and rendering
   - Indicator factory for creating new indicators
   - State management with Zustand for tracking indicator state

3. **UI Components**
   - Dedicated controls for adding and managing indicators
   - Configuration dialog for adjusting indicator parameters

## Implementation Status

✅ **Completed**:

- Directory structure and architecture
- Core type definitions
- Base indicator interface and abstract class
- Multiple indicator implementations:
  - MACD (Moving Average Convergence Divergence)
  - SMA (Simple Moving Average)
  - EMA (Exponential Moving Average)
  - RSI (Relative Strength Index)
- Chart utilities for pane management
- Indicator factory and store
- UI components for managing indicators

⬜ **In Progress**:

- Fixing type linter errors
- Implementing remaining indicators (Bollinger Bands, ATR, Stochastic)
- Implementing chart instance with multiple panes

⏩ **Deferred**:

- Unit and integration tests

## How to Use the System

### Adding a New Indicator

To add a new indicator to a chart:

```typescript
import { createAndAddIndicator } from "@/components/trading/chart/indicators/indicatorStore";

// Create and add a MACD indicator
const macdKey = createAndAddIndicator("MACD", {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
});

// Create and add an SMA indicator
const smaKey = createAndAddIndicator("SMA", {
  period: 20,
});

// Create and add an RSI indicator
const rsiKey = createAndAddIndicator("RSI", {
  period: 14,
  overboughtLevel: 70,
  oversoldLevel: 30,
});
```

### Removing an Indicator

```typescript
import { useIndicatorStore } from "@/components/trading/chart/indicators/indicatorStore";

const { removeIndicator } = useIndicatorStore();
removeIndicator(indicatorKey);
```

### Creating a New Indicator Type

1. Create calculation function in `indicators/calculations/`
2. Create renderer class in `indicators/renderers/`
3. Add to indicator factory in `indicatorFactory.ts`
4. Add default parameters in `ChartTypes.ts`

## Next Steps

1. Fix remaining linter errors
2. Implement remaining indicators (Bollinger Bands, ATR, Stochastic)
3. Create the chart instance component
4. Integrate with the existing chart UI
5. Test and refine the system

## Known Issues

- Type errors need to be resolved
- Some component props may need refinement
- Chakra UI integration needs to be validated
- Testing is still needed

## Contributing

When adding new indicators, follow these guidelines:

1. Keep calculation logic separate from rendering logic
2. Follow the established pattern for indicator renderers
3. Update the factory and store when adding new indicator types
4. Make sure to add appropriate type definitions
5. Update the README when adding major features
