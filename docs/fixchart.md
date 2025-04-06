# Chart Component Cleanup Plan

## Current Issues

1. **Unused Functions and Code**

   - Many functions are defined but never used
   - Duplicate functionality between chart.tsx and indicator system
   - Calculation functions that should be in separate utility files
   - Complex indicator logic mixed with chart rendering

2. **Code Organization Problems**

   - All indicator calculations in main chart file
   - Mixed responsibilities (rendering, calculations, state management)
   - No separation between chart core and indicator features
   - Utility functions mixed with component logic

3. **Specific Redundancies**
   - Multiple indicator calculation functions that are now handled by indicator store
   - Unused pane management functions that duplicate indicator store functionality
   - Redundant candle formatting functions
   - Unused event handlers and dialog management

## Cleanup Plan

### Phase 1: Function Audit

- [x] Review and mark all unused functions
- [x] Identify duplicate functionality with indicator system
- [x] List functions to be moved to utility files
- [x] Document dependencies between functions

### Phase 2: Code Extraction

- [x] Move calculation functions to utils/indicators/
  - [x] SMA calculation
  - [x] EMA calculation
  - [x] RSI calculation
  - [x] MACD calculation
  - [x] Stochastic calculation
  - [x] ATR calculation
  - [x] Bollinger Bands calculation
- [x] Move candle formatting to utils/candles.ts
- [x] Create chartUtils.ts for chart-specific utilities

### Phase 3: Component Cleanup

- [x] Remove unused state variables
- [x] Remove redundant indicator management code
- [x] Simplify chart initialization
- [x] Fix ChartHeader props
- [x] Remove unused imports

### Phase 4: Refactor Core Chart Logic

- [x] Separate chart core functionality
- [x] Move indicator-specific logic to indicator system
- [x] Clean up event handling
- [x] Improve error handling
- [x] Add proper TypeScript types

### Phase 5: Testing & Validation

- [ ] Test chart with all indicators
- [ ] Verify no functionality loss
- [ ] Check performance improvements
- [ ] Update documentation

## Functions to Remove/Move

### Move to utils/indicators/

```typescript
calculateSMA();
calculateEMA();
calculateRSI();
calculateMACD();
calculateEMAFromPoints();
calculateStochastic(); // if exists
calculateATR();
calculateBollingerBands();
```

### Move to utils/candles.ts

```typescript
formatCandlesForIndicator();
// Any other candle formatting utilities
```

### Remove (Already in IndicatorStore)

```typescript
createMACDIndicator();
updateMACDData();
cleanupMACDIndicator();
createStochasticIndicator();
createATRIndicator();
createBollingerBandsIndicator();
createIchimokuIndicator();
```

### Remove (Unused)

```typescript
openIndicatorDialog();
handleRemoveIndicator();
getNextAvailablePaneIndex(); // Now in ChartUtils
ensurePaneExists(); // Now in ChartUtils
```

## Next Steps

1. Start with Phase 3: Component Cleanup
2. Focus on removing unused code and simplifying chart initialization
3. Test each change to ensure no functionality loss

Would you like to start with Phase 3: Component Cleanup?
