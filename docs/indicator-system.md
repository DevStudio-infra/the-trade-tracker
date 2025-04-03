# Indicator System Analysis

## Current System Overview

### Components

1. **IndicatorControls.tsx**

   - UI component for adding/removing indicators
   - Handles indicator visibility
   - Manages oscillator restrictions
   - Uses `useIndicatorStore` for state management

2. **indicatorStore.ts**

   - Central state management for indicators
   - Handles indicator creation and removal
   - Manages chart instance and data updates

3. **ChartInstance.tsx**

   - Renders the main chart
   - Creates panes for indicators
   - Manages series creation and updates

4. **Indicator Renderers**
   - Individual renderer classes for each indicator type
   - Handle series creation and data calculations
   - Manage pane assignments

### Current Behavior

1. **RSI (Working Correctly)**

   - Creates in separate pane
   - Properly manages multiple instances
   - Deletes cleanly
   - No overlapping issues

2. **MACD (Partially Working)**

   - Creates in separate pane
   - Multiple instances overlap
   - Doesn't clean up properly
   - Interferes with other indicators

3. **Other Indicators (Not Working)**
   - All render in pane 1
   - Overlap with each other
   - No proper pane management
   - No cleanup on removal

## Issues to Fix

### 1. Pane Management

- [ ] Implement proper pane creation for each oscillator
- [ ] Ensure panes are removed when indicators are deleted
- [ ] Add pane index tracking in indicator store

### 2. Series Management

- [ ] Fix MACD series creation and cleanup
- [ ] Implement proper series removal for all indicators
- [ ] Add series tracking per indicator

### 3. Indicator Isolation

- [ ] Ensure each indicator has its own pane when required
- [ ] Prevent overlapping of oscillators
- [ ] Implement proper cleanup on removal

### 4. Store Enhancements

- [ ] Add pane tracking to indicator store
- [ ] Implement better series management
- [ ] Add validation for indicator creation

## Implementation Plan

### Phase 1: Store Enhancement

1. [ ] Update indicator store to track panes
2. [ ] Add series management methods
3. [ ] Implement validation system

### Phase 2: Renderer Updates

1. [ ] Fix MACD renderer
2. [ ] Update other indicator renderers
3. [ ] Implement proper cleanup methods

### Phase 3: UI Updates

1. [ ] Update IndicatorControls for better management
2. [ ] Add visual feedback for pane creation/deletion
3. [ ] Improve error handling

### Phase 4: Testing & Validation

1. [ ] Test each indicator type
2. [ ] Verify cleanup functionality
3. [ ] Check for overlapping issues
4. [ ] Validate pane management

## Testing Checkpoints

We will need visual confirmation at these points:

1. After store enhancement implementation
2. After each renderer update
3. After UI updates
4. Final validation of all fixes

Would you like me to start with Phase 1: Store Enhancement?
