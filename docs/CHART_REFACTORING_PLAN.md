# Chart Component Refactoring Plan

## Overview

The current `chart.tsx` is a monolithic component with over 1,200 lines of code, handling multiple responsibilities:

- Chart initialization and rendering
- Data fetching and state management
- Timeframe selection
- Indicator management
- Error handling and loading states

Breaking this down into smaller, focused components will improve:

- **Maintainability**: Easier to understand and modify individual pieces
- **Reusability**: Components can be reused across the application
- **Testing**: Smaller components are easier to test
- **Performance**: More targeted re-renders

## Implementation Todo List

### Phase 1: Setup Structure and Types

- [x] Create folder structure
  - [x] `client/src/components/trading/chart/`
  - [x] `client/src/components/trading/chart/indicators/`
  - [x] `client/src/components/trading/chart/utils/`
- [x] Extract shared types to `utils/chartTypes.ts`
  - [x] Indicator types
  - [x] Chart data types
  - [x] Configuration types
- [x] Extract utilities
  - [x] Create `utils/chartUtils.ts` with theme-based colors and helpers
  - [x] Create `utils/indicatorCalculations.ts` for indicator math functions

### Phase 2: Extract Core Rendering Components

- [x] Create `ChartContainer.tsx`
  - [x] Move chart initialization logic
  - [x] Handle resize events
  - [x] Implement theme switching
- [x] Create `CandlestickRenderer.tsx`
  - [x] Extract candlestick rendering logic
  - [x] Extract volume rendering logic
- [x] Update parent `TradingChart.tsx` component
  - [x] Clean up and use new components

_Status: Complete ✅_

### Phase 3: Extract UI Components

- [x] Create `TimeframeSelector.tsx`
  - [x] Move timeframe selection UI and logic
- [x] Create `ChartHeader.tsx`
  - [x] Extract header component with controls
- [x] Create state-specific components
  - [x] `ChartLoadingState.tsx`
  - [x] `ChartErrorState.tsx`

### Phase 4: Extract Indicator Components

- [x] Create `indicators/IndicatorManager.tsx`
  - [x] Move dropdown for adding indicators
- [x] Create `indicators/IndicatorDialog.tsx`
  - [x] Extract indicator configuration dialog
  - [x] Fix the dialog functionality issues
- [x] Create `indicators/IndicatorBadge.tsx`
  - [x] Extract active indicator badges
- [x] Create `indicators/IndicatorRenderer.tsx`
  - [x] Extract indicator rendering logic

### Phase 5: Integration and Testing

- [x] Integrate all components
  - [x] Update imports/exports
  - [x] Ensure proper prop passing
- [ ] Test all functionality
  - [ ] Chart rendering
  - [ ] Data loading
  - [ ] Indicator adding/removing
  - [ ] Timeframe switching
- [ ] Performance optimization
  - [ ] Review re-render patterns
  - [ ] Add memoization where needed

_Status: Integration complete, testing and optimization pending_

## Component Breakdown

### 1. Core Components

#### `TradingChart.tsx` (Parent Container)

- Main container component
- Handles main state management
- Coordinates child components

#### `ChartContainer.tsx`

- Responsible for chart instance initialization
- Manages chart resize events
- Handles theme changes

#### `CandlestickRenderer.tsx`

- Renders candlestick data
- Manages volume visualization
- Handles data formatting for charts

### 2. UI Components

#### `TimeframeSelector.tsx`

- Manages timeframe selection
- Displays timeframe options

#### `ChartHeader.tsx`

- Displays pair information
- Contains controls for chart settings

#### `ChartLoadingState.tsx`

- Displays loading indicators
- Handles retry logic

#### `ChartErrorState.tsx`

- Displays error messages
- Provides retry functionality

### 3. Indicator Components

#### `IndicatorManager.tsx`

- High-level indicator management
- Contains dropdown for adding indicators

#### `IndicatorDialog.tsx`

- Dialog for configuring indicator parameters
- Handles indicator creation

#### `IndicatorBadge.tsx`

- Displays active indicator badge
- Allows removing indicators

#### `IndicatorRenderer.tsx`

- Calculates and renders indicators on chart
- Manages indicator series

### 4. Utility Files

#### `chartUtils.ts`

- Contains chart-related utilities
- Chart color definitions
- Theme-based configuration

#### `indicatorCalculations.ts`

- Contains calculations for various indicators (SMA, EMA, RSI, etc.)
- Pure calculation functions

#### `chartTypes.ts`

- TypeScript definitions for chart-related types
- Type definitions for indicators

## Folder Structure

```
components/
  trading/
    chart/
      TradingChart.tsx             # Main container
      ChartContainer.tsx           # Chart initialization
      CandlestickRenderer.tsx      # Renders candles and volume
      TimeframeSelector.tsx        # Timeframe selection UI
      ChartHeader.tsx              # Chart header with controls
      ChartLoadingState.tsx        # Loading indicators
      ChartErrorState.tsx          # Error display
      indicators/
        IndicatorManager.tsx       # Indicator management
        IndicatorDialog.tsx        # Dialog for adding indicators
        IndicatorBadge.tsx         # Active indicator display
        IndicatorRenderer.tsx      # Renders indicators on chart
      utils/
        chartUtils.ts              # Chart utilities
        indicatorCalculations.ts   # Calculation functions
        chartTypes.ts              # TypeScript definitions
```

## Implementation Notes

- Start with small, focused changes
- Test each component as it's extracted
- Update imports incrementally
- Focus on fixing the indicator dialog issues during the indicator component extraction phase
- Consider backward compatibility during transition
