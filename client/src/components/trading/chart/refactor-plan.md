# Chart Refactoring Plan

## Current Issues

1. **Code Duplication**

   - Multiple chart-related files with overlapping functionality
   - Duplicate type definitions (e.g., `IPaneApi`)
   - Redundant indicator creation logic
   - Multiple places handling indicator state

2. **File Organization**

   - Large monolithic files (IndicatorRenderer.tsx is 1300+ lines)
   - Mixed concerns in single files
   - Unclear separation of responsibilities
   - Scattered debug logging

3. **Type Safety**
   - Inconsistent type usage
   - Multiple chart type definitions
   - Unclear interfaces between components
   - Type casting issues with chart API

## Proposed Directory Structure

```
client/src/components/trading/
├── chart/
│   ├── core/
│   │   ├── ChartInstance.tsx       # Core chart creation and management
│   │   ├── ChartTypes.ts          # Shared type definitions
│   │   └── ChartUtils.ts          # Common utility functions
│   ├── indicators/
│   │   ├── base/
│   │   │   ├── IndicatorBase.ts   # Base indicator class/interface
│   │   │   └── types.ts           # Common indicator types
│   │   ├── calculations/
│   │   │   ├── index.ts           # Exports all calculations
│   │   │   ├── macd.ts           # MACD specific calculations
│   │   │   ├── rsi.ts            # RSI specific calculations
│   │   │   ├── sma.ts            # SMA specific calculations
│   │   │   ├── ema.ts            # EMA specific calculations
│   │   │   ├── bollinger.ts      # Bollinger Bands calculations
│   │   │   ├── atr.ts            # ATR calculations
│   │   │   └── stochastic.ts     # Stochastic calculations
│   │   ├── renderers/
│   │   │   ├── index.ts           # Exports all renderers
│   │   │   ├── MACDRenderer.ts    # MACD renderer
│   │   │   ├── SMARenderer.ts     # SMA renderer
│   │   │   ├── EMARenderer.ts     # EMA renderer
│   │   │   ├── RSIRenderer.ts     # RSI renderer
│   │   │   ├── BollingerBandsRenderer.ts  # Bollinger Bands renderer
│   │   │   ├── ATRRenderer.ts     # ATR renderer
│   │   │   └── StochasticRenderer.ts      # Stochastic renderer
│   │   ├── indicatorFactory.ts    # Factory for creating indicators
│   │   └── indicatorStore.ts      # State management for indicators
│   ├── README.md                 # Documentation
│   └── TradingChart.tsx          # Main chart component
```

## Current Focus

1. Implement a robust architecture for indicators
2. Ensure proper typing throughout the codebase
3. Fix memory leaks and improve performance
4. Add additional indicators

## Phase 1: Core Architecture ✅

- [x] Create base indicator class
- [x] Implement indicator factory
- [x] Add proper typing for chart components
- [x] Setup multi-pane architecture

## Phase 2: Indicator Migration ✅

- [x] Migrate existing SMA implementation
- [x] Migrate existing EMA implementation
- [x] Migrate existing RSI implementation
- [x] Implement MACD
- [x] Implement Bollinger Bands
- [x] Implement ATR (Average True Range)
- [x] Implement Stochastic

## Phase 3: State Management & UI ✅

- [x] Implement indicator state management with Zustand
- [x] Create UI components for adding/removing/configuring indicators
- [x] Create chart instance component that uses all indicators
- [x] Update TradingChart to use new architecture

## Phase 4: Final Improvements

- [ ] Fix remaining linter errors
- [ ] Add comprehensive error handling
- [ ] Optimize performance (minimize re-renders)
- [ ] Add additional customization options
- [ ] Write unit tests

## Future Enhancements

- [ ] Add drawing tools
- [ ] Implement trading signals visualization
- [ ] Add more advanced indicators
- [ ] Custom themes
- [ ] Save/load chart configurations
