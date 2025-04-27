# Server-Side Lightweight Chart Rendering in Trade Tracker

This document explains how Trade Tracker generates trading charts using the TradingView lightweight-charts library on the server (Node.js), not in the browser. This approach is used to produce chart images (PNGs) for AI analysis, reports, or sharing.

---

## Overview
- **How:** Uses Puppeteer to run a headless Chromium browser, loads a minimal HTML page with lightweight-charts, renders the chart, and captures a PNG image.
- **Why:** Enables programmatic chart generation on the backend, useful for AI workflows, email reports, and bots.

---

## Key Function: `generateChartImage`

```ts
import puppeteer from 'puppeteer';
import { CandleData } from '../services/ai/signal-detection/types';

export async function generateChartImage(candles: CandleData[], strategies: string[]): Promise<Buffer> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          #chart {
            width: 1200px;
            height: 800px;
            background-color: #1a1a1a;
          }
        </style>
      </head>
      <body style="margin: 0;">
        <div id="chart"></div>
        <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
        <script>
          const chart = LightweightCharts.createChart(document.getElementById('chart'), {
            width: 1200,
            height: 800,
            layout: {
              background: { type: 'solid', color: '#1a1a1a' },
              textColor: '#d1d4dc',
            },
            grid: {
              vertLines: { color: '#2B2B43' },
              horzLines: { color: '#2B2B43' },
            },
            crosshair: {
              mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
              borderColor: '#2B2B43',
            },
            timeScale: {
              borderColor: '#2B2B43',
              timeVisible: true,
            },
          });

          const candleSeries = chart.addCandlestickSeries({
            upColor: '#4CAF50',
            downColor: '#FF5252',
            borderDownColor: '#FF5252',
            borderUpColor: '#4CAF50',
            wickDownColor: '#FF5252',
            wickUpColor: '#4CAF50',
          });

          const candleData = ${'${JSON.stringify(candles.map((c) => ({ time: c.timestamp / 1000, open: c.open, high: c.high, low: c.low, close: c.close })))}'};

          candleSeries.setData(candleData);

          // Add EMA if strategy includes it
          if (${JSON.stringify(strategies)}.includes('EMA_Pullback')) {
            const emaData = calculateEMA(candleData, 20);
            const emaSeries = chart.addLineSeries({
              color: '#FFD700',
              lineWidth: 2,
            });
            emaSeries.setData(emaData);
          }

          // Add RSI if strategy includes it
          if (${JSON.stringify(strategies)}.includes('RSI')) {
            const rsiData = calculateRSI(candleData, 14);
            const rsiSeries = chart.addLineSeries({
              color: '#00BCD4',
              lineWidth: 2,
              priceScaleId: 'rsi',
              pane: 1,
            });
            chart.applyOptions({
              rightPriceScale: {
                scaleMargins: { top: 0.1, bottom: 0.1 },
              },
            });
            rsiSeries.setData(rsiData);
          }

          // Helper function to calculate EMA
          function calculateEMA(data, period) {
            const ema = [];
            const multiplier = 2 / (period + 1);

            // Calculate SMA first
            let sum = 0;
            for (let i = 0; i < period; i++) {
              sum += data[i].close;
            }
            ema.push({ time: data[period - 1].time, value: sum / period });

            // Calculate EMA
            for (let i = period; i < data.length; i++) {
              const value = (data[i].close - ema[ema.length - 1].value) * multiplier + ema[ema.length - 1].value;
              ema.push({ time: data[i].time, value });
            }
            return ema;
          }

          // Helper function to calculate RSI
          function calculateRSI(data, period) {
            const rsi = [];
            const gains = [];
            const losses = [];
            for (let i = 1; i < data.length; i++) {
              const change = data[i].close - data[i - 1].close;
              gains.push(Math.max(0, change));
              losses.push(Math.max(0, -change));
            }
            let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
            for (let i = period; i < data.length; i++) {
              avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
              avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
              const rs = avgGain / avgLoss;
              const rsiValue = 100 - (100 / (1 + rs));
              rsi.push({ time: data[i].time, value: rsiValue });
            }
            return rsi;
          }

          chart.timeScale().fitContent();
        </script>
      </body>
    </html>
  `;

  // Launch puppeteer
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.setContent(html);
  await page.waitForFunction(() => {
    const chart = document.querySelector("#chart");
    return chart && chart.children.length > 0;
  });
  const screenshot = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1200, height: 800 } });
  await browser.close();
  return screenshot;
}
```

---

## Full Server-Side Chart Rendering Code

Below is the complete code from `/server/src/utils/chart.utils.ts` used to render trading charts (with indicators) on the server using Puppeteer and TradingView lightweight-charts. This includes:
- Chart HTML generation
- Dynamic indicator (EMA, RSI) rendering
- Helper functions for indicator calculations
- Puppeteer orchestration for headless rendering and screenshot

### Code: `/server/src/utils/chart.utils.ts`

```ts
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";
import puppeteer from "puppeteer";
import { CandleData } from "../services/ai/signal-detection/types";

export async function generateChartImage(candles: CandleData[], strategies: string[]): Promise<Buffer> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          #chart {
            width: 1200px;
            height: 800px;
            background-color: #1a1a1a;
          }
        </style>
      </head>
      <body style="margin: 0;">
        <div id="chart"></div>
        <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
        <script>
          const chart = LightweightCharts.createChart(document.getElementById('chart'), {
            width: 1200,
            height: 800,
            layout: {
              background: { type: 'solid', color: '#1a1a1a' },
              textColor: '#d1d4dc',
            },
            grid: {
              vertLines: { color: '#2B2B43' },
              horzLines: { color: '#2B2B43' },
            },
            crosshair: {
              mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
              borderColor: '#2B2B43',
            },
            timeScale: {
              borderColor: '#2B2B43',
              timeVisible: true,
            },
          });

          const candleSeries = chart.addCandlestickSeries({
            upColor: '#4CAF50',
            downColor: '#FF5252',
            borderDownColor: '#FF5252',
            borderUpColor: '#4CAF50',
            wickDownColor: '#FF5252',
            wickUpColor: '#4CAF50',
          });

          const candleData = ${JSON.stringify(
            candles.map((c) => ({
              time: c.timestamp / 1000,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            }))
          )};

          candleSeries.setData(candleData);

          // Add EMA if strategy includes it
          if (${JSON.stringify(strategies)}.includes('EMA_Pullback')) {
            const emaData = calculateEMA(candleData, 20);
            const emaSeries = chart.addLineSeries({
              color: '#FFD700',
              lineWidth: 2,
            });
            emaSeries.setData(emaData);
          }

          // Add RSI if strategy includes it
          if (${JSON.stringify(strategies)}.includes('RSI')) {
            const rsiData = calculateRSI(candleData, 14);
            const rsiSeries = chart.addLineSeries({
              color: '#00BCD4',
              lineWidth: 2,
              priceScaleId: 'rsi',
              pane: 1,
            });
            chart.applyOptions({
              rightPriceScale: {
                scaleMargins: {
                  top: 0.1,
                  bottom: 0.1,
                },
              },
            });
            rsiSeries.setData(rsiData);
          }

          // Helper function to calculate EMA
          function calculateEMA(data, period) {
            const ema = [];
            const multiplier = 2 / (period + 1);

            // Calculate SMA first
            let sum = 0;
            for (let i = 0; i < period; i++) {
              sum += data[i].close;
            }
            ema.push({ time: data[period - 1].time, value: sum / period });

            // Calculate EMA
            for (let i = period; i < data.length; i++) {
              const value = (data[i].close - ema[ema.length - 1].value) * multiplier + ema[ema.length - 1].value;
              ema.push({ time: data[i].time, value });
            }

            return ema;
          }

          // Helper function to calculate RSI
          function calculateRSI(data, period) {
            const rsi = [];
            const gains = [];
            const losses = [];

            // Calculate price changes
            for (let i = 1; i < data.length; i++) {
              const change = data[i].close - data[i - 1].close;
              gains.push(Math.max(0, change));
              losses.push(Math.max(0, -change));
            }

            // Calculate initial averages
            let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
            let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

            // Calculate RSI
            for (let i = period; i < data.length; i++) {
              avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
              avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;

              const rs = avgGain / avgLoss;
              const rsiValue = 100 - (100 / (1 + rs));
              rsi.push({ time: data[i].time, value: rsiValue });
            }

            return rsi;
          }

          // Fit the chart content
          chart.timeScale().fitContent();
        </script>
      </body>
    </html>
  `;

  // Launch puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Set viewport and content
  await page.setViewport({ width: 1200, height: 800 });
  await page.setContent(html);

  // Wait for chart to render
  await page.waitForFunction(() => {
    const chart = document.querySelector("#chart");
    return chart && chart.children.length > 0;
  });

  // Take screenshot
  const screenshot = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: 1200, height: 800 },
  });

  // Close browser
  await browser.close();

  return screenshot;
}
```

### How This Works
- **Chart HTML**: Generates a minimal HTML page with a chart container and loads lightweight-charts from CDN.
- **Candlestick Series**: Renders price bars from provided candle data.
- **Dynamic Indicators**: EMA and RSI are calculated and rendered if specified in the `strategies` array.
- **Indicator Logic**: Calculation functions for EMA and RSI are included in the HTML, running in the browser context.
- **Dynamic Panes**: RSI is rendered on a separate pane below the price chart.
- **Headless Rendering**: Puppeteer launches Chromium, loads the page, waits for rendering, and captures a PNG.
- **Return**: The PNG buffer is returned for use in AI, reporting, or sharing.

---

## How It Works (Step by Step)
1. **Build HTML**: Generates a minimal HTML page with a `div#chart` and loads lightweight-charts via CDN.
2. **Inject Data**: Serializes candle data and strategies, injects them into the script.
3. **Render Chart**: Adds a candlestick series, and dynamically adds indicators (e.g., EMA, RSI) based on the strategies array.
4. **Indicator Calculation**: EMA and RSI are calculated in vanilla JS in the browser context.
5. **Launch Headless Browser**: Puppeteer launches Chromium, loads the HTML, and waits for the chart to render.
6. **Screenshot**: Captures a PNG of the chart area and returns it as a Buffer.

---

## Dynamic Panes and Indicators
- **Main price chart**: Candlestick series.
- **Additional indicators**: If a strategy requires it, e.g., EMA is drawn as a line, RSI is rendered in a separate pane below the price chart.
- **Pane assignment**: For RSI, the script uses `pane: 1` to place it on a separate panel.

---

## Usage Example
```ts
const candles = [
  { timestamp: 1682572800000, open: 100, high: 105, low: 95, close: 102 },
  { timestamp: 1682659200000, open: 102, high: 110, low: 101, close: 108 },
  // ...more candles
];
const strategies = ['EMA_Pullback', 'RSI'];
const imgBuffer = await generateChartImage(candles, strategies);
// imgBuffer is a PNG Buffer, save or send as needed
```

---

## Why Use This Approach?
- **Server-side charts**: Useful for generating images for AI, email, or reporting, without a browser UI.
- **Dynamic**: Add or remove indicators and panes based on strategy or user config.
- **Portable**: Works anywhere Node.js and Puppeteer are supported.

---

## Extending Further
- Add more indicators by extending the script section.
- Use more panes for additional indicators (MACD, Stochastic, etc.) by specifying `pane: n`.
- Adjust chart size, colors, and layout as needed.

---

## References
- [Lightweight Charts Docs](https://tradingview.github.io/lightweight-charts/)
- [Puppeteer Docs](https://pptr.dev/)
- See `/server/src/utils/chart.utils.ts` for the full implementation.

---

## Summary
- The Trade Tracker backend can generate high-quality chart images with dynamic indicators and panes using lightweight-charts and Puppeteer.
- This is ideal for AI workflows, reporting, and automation.
