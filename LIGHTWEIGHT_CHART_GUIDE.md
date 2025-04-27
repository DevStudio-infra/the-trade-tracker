# Lightweight Chart Implementation in Trade Tracker

This guide explains how the Trade Tracker app implements interactive trading charts using the TradingView [lightweight-charts](https://tradingview.github.io/lightweight-charts/) library. It covers:
- Chart rendering basics
- Dynamic panes for indicators
- Key code snippets
- How to extend and customize

---

## 1. Chart Rendering Basics

The core chart is rendered using `lightweight-charts`, which is highly performant and ideal for financial data.

### Minimal Example
```tsx
import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const sampleData = [
  { time: '2025-04-01', open: 100, high: 110, low: 90, close: 105 },
  { time: '2025-04-02', open: 105, high: 115, low: 95, close: 110 },
  { time: '2025-04-03', open: 110, high: 120, low: 100, close: 115 },
];

export const LightweightChart = () => {
  const chartContainerRef = useRef(null);
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, { width: 600, height: 300 });
    const candleSeries = chart.addCandlestickSeries();
    candleSeries.setData(sampleData);
    return () => chart.remove();
  }, []);
  return <div ref={chartContainerRef} />;
};
```

---

## 2. Full Trading Chart with Dynamic Panes

In Trade Tracker, the chart supports multiple panes (e.g., main price, RSI, MACD) and dynamic indicator management.

### Example: Chart with RSI Pane
```html
<script>
  const chart = LightweightCharts.createChart(document.getElementById('chart'), {
    height: 400,
    width: 600,
    layout: { background: { color: '#fff' } },
    rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.3 } },
    panels: [
      { height: 70 }, // Panel for RSI (below)
    ],
  });

  // Main price series (candlesticks)
  const mainSeries = chart.addCandlestickSeries();
  mainSeries.setData([
    { time: 1682572800, open: 100, high: 105, low: 95, close: 102 },
    { time: 1682659200, open: 102, high: 110, low: 101, close: 108 },
    // ... more bar data
  ]);

  // RSI series on separate pane
  const rsiPanelIndex = 1;
  const rsiSeries = chart.addLineSeries({ panel: rsiPanelIndex, color: 'purple' });
  rsiSeries.setData([
    { time: 1682572800, value: 45 },
    { time: 1682659200, value: 60 },
    // ... more RSI data
  ]);
</script>
```
**Key Points:**
- Use the `panels` option to define additional panes.
- Use `addLineSeries({ panel: n })` to attach a series to a specific pane.

---

## 3. Dynamic Indicator Management

Trade Tracker allows users to add/remove indicators (SMA, RSI, MACD, etc.) dynamically. Each indicator can specify its preferred pane.

### Indicator Base Interface (TypeScript)
```ts
export interface BaseIndicator {
  initialize: (chart: ChartApiWithPanes, config: IndicatorConfig) => void;
  createSeries: (paneIndex: number) => ISeriesApi<SeriesType> | null;
  updateData: (candles: FormattedCandle[]) => void;
  destroy: () => void;
  getPreferredPaneIndex: () => number;
}
```

### Example: SMA Renderer
```ts
export class SMARenderer extends IndicatorBase {
  createSeries(paneIndex: number) {
    if (!this.chart) return null;
    return this.chart.addLineSeries({ pane: paneIndex, color: this.config.color });
  }
  getPreferredPaneIndex() { return 0; } // Main price pane
}
```

### Example: Adding a New Indicator
```ts
const handleAddIndicator = (type: string) => {
  const { createAndAddIndicator } = useIndicatorStore.getState();
  const id = createAndAddIndicator(type); // Adds to correct pane
};
```

---

## 4. Chart Container and Pane Management

The chart container sets up the chart, manages panes, and resizes dynamically.

```tsx
export function ChartContainer({ height = 500, indicatorCount = 0 }) {
  const chartContainerRef = useRef(null);
  useEffect(() => {
    // ... create chart
    // Example: Add oscillator pane if needed
    if (indicatorCount > 0) {
      chart.applyOptions({
        layout: {
          panes: {
            [1]: { leftPriceScale: { visible: true } },
          },
        },
      });
    }
    // ...
  }, [indicatorCount]);
  return <div ref={chartContainerRef} style={{ height }} />;
}
```

---

## 5. Customization & Extending
- **Add new indicators** by implementing the `BaseIndicator` interface.
- **Assign indicators to panes** using `getPreferredPaneIndex`.
- **Dynamically add/remove panes** as indicators are added/removed.
- **Sync chart theme** with app theme using chart options.

---

## 6. References
- [Lightweight Charts Documentation](https://tradingview.github.io/lightweight-charts/)
- See `/client/src/components/trading/chart/` for full implementation in this repo.

---

## Summary
- The Trade Tracker chart is fully dynamic, supporting multiple panes and indicators.
- Indicators can be added/removed at runtime, and each can render in its own pane.
- The system is modular and easily extensible for new indicators or chart types.

For advanced usage, see the code in `/client/src/components/trading/chart/` and related indicator renderers.
