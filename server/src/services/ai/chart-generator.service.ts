import puppeteer from "puppeteer";
import { ChartOptions } from "../../types/chart.types";

interface GenerateChartOptions {
  pair: string;
  timeframe: string;
  indicators: string[];
}

interface ChartReadyResponse {
  success: boolean;
  error?: string;
}

// Extend the Window interface
declare global {
  interface Window {
    chartError?: string;
    chartsReady?: boolean;
    lightweightChartsLoaded?: Promise<void>;
    onLightweightChartsLoad?: () => void;
  }
}

export class ChartGenerator {
  async generateChart(candles: any[], options: GenerateChartOptions): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--allow-insecure-localhost",
        "--disable-dev-shm-usage",
      ],
    });

    try {
      console.log("Initializing chart generation...");
      console.log(`Candles received: ${candles.length}`);

      const page = await browser.newPage();

      // Enable request interception and logging
      await page.setRequestInterception(true);
      page.on("request", (request) => {
        console.log(`Resource requested: ${request.url()}`);
        request.continue();
      });
      page.on("requestfailed", (request) => {
        console.error(`Resource failed to load: ${request.url()}`);
      });

      // Set viewport size
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1,
      });

      // Create HTML content with chart
      const html = this.createChartHtml(candles, options);
      await page.setContent(html, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      // Add background color to ensure visibility
      await page.evaluate(() => {
        document.body.style.backgroundColor = "#1E222D";
        const chartDiv = document.getElementById("chart");
        if (chartDiv) {
          chartDiv.style.backgroundColor = "#1E222D";
        }
      });

      // Wait for chart to render
      console.log("Waiting for chart to render...");
      await page.waitForSelector("#chart-container", { timeout: 10000 });

      // Wait for chart content to be ready
      const isChartReady = await page.evaluate(() => {
        return new Promise<ChartReadyResponse>((resolve) => {
          let checkCount = 0;
          const maxChecks = 300; // 30 seconds with 100ms interval

          // Check every 100ms if charts are ready
          const checkInterval = setInterval(() => {
            checkCount++;
            const win = window as Window;

            if (win.chartError) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve({ success: false, error: win.chartError });
            }

            if (win.chartsReady || checkCount >= maxChecks) {
              const mainChart = document.querySelector("#main-chart canvas") as HTMLCanvasElement | null;
              const rsiChart = document.querySelector("#rsi-chart canvas") as HTMLCanvasElement | null;
              const atrChart = document.querySelector("#atr-chart canvas") as HTMLCanvasElement | null;
              const adxChart = document.querySelector("#adx-chart canvas") as HTMLCanvasElement | null;

              if (mainChart && rsiChart && atrChart && adxChart) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve({ success: true });
              }
            }
          }, 100);

          // Timeout after 30 seconds
          const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            resolve({ success: false, error: "Chart rendering timed out" });
          }, 30000);
        });
      });

      if (!isChartReady.success) {
        throw new Error(`Chart failed to render properly: ${isChartReady.error || "unknown error"}`);
      }

      // Additional wait for any animations
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Take screenshot
      console.log("Taking chart screenshot...");
      const element = await page.$("#chart-container");
      if (!element) {
        throw new Error("Chart container not found");
      }

      const screenshot = await element.screenshot({
        type: "png",
        omitBackground: false,
      });

      // Verify screenshot is not empty
      if (!screenshot || screenshot.length === 0) {
        throw new Error("Generated screenshot is empty");
      }

      console.log(`Chart generated successfully. Size: ${screenshot.length} bytes`);
      return screenshot;
    } catch (error) {
      console.error("Chart generation failed:", error);
      throw new Error(`Failed to generate chart: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      await browser.close();
    }
  }

  private createChartHtml(candles: any[], options: GenerateChartOptions): string {
    const candleData = JSON.stringify(
      candles.map((candle) => ({
        time: candle.timestamp / 1000,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        value: candle.close, // For RSI calculation
      }))
    );

    return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Trading Chart</title>
                <script>
                    // Define a global promise that will resolve when the library is loaded
                    window.lightweightChartsLoaded = new Promise((resolve, reject) => {
                        window.onLightweightChartsLoad = () => {
                            console.log('LightweightCharts library loaded');
                            resolve();
                        };
                        setTimeout(() => reject(new Error('Script load timeout')), 10000);
                    });
                </script>
                <script src="https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"
                        onload="window.onLightweightChartsLoad()"
                        onerror="window.chartError = 'Failed to load LightweightCharts library'"></script>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #1E222D;
                    }
                    #chart-container {
                        position: relative;
                        width: 1200px;
                        height: 800px;
                        background: #1E222D;
                        overflow: hidden;
                    }
                    #main-chart {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 1200px;
                        height: 400px;
                        background: #1E222D;
                    }
                    #rsi-chart {
                        position: absolute;
                        top: 400px;
                        left: 0;
                        width: 1200px;
                        height: 133px;
                        background: #1E222D;
                    }
                    #atr-chart {
                        position: absolute;
                        top: 533px;
                        left: 0;
                        width: 1200px;
                        height: 133px;
                        background: #1E222D;
                    }
                    #adx-chart {
                        position: absolute;
                        top: 666px;
                        left: 0;
                        width: 1200px;
                        height: 133px;
                        background: #1E222D;
                    }
                </style>
            </head>
            <body>
                <div id="chart-container">
                    <div id="main-chart"></div>
                    <div id="rsi-chart"></div>
                    <div id="atr-chart"></div>
                    <div id="adx-chart"></div>
                </div>
                <script>
                    // Wait for LightweightCharts to be available
                    async function waitForCharts() {
                        try {
                            await window.lightweightChartsLoaded;
                            console.log('LightweightCharts library ready');
                            return window.LightweightCharts;
                        } catch (error) {
                            console.error('Failed to load LightweightCharts:', error);
                            window.chartError = error.message;
                            throw error;
                        }
                    }

                    // Initialize charts
                    async function initializeCharts() {
                        try {
                            console.log('Starting chart initialization...');
                            const { createChart } = await waitForCharts();
                            console.log('Chart creation function available');

                            // Create main chart
                            const mainChart = createChart(document.getElementById('main-chart'), {
                                width: 1200,
                                height: 400,
                                layout: {
                                    background: { color: '#1E222D' },
                                    textColor: '#DDD',
                                    fontSize: 12,
                                    fontFamily: 'Roboto, sans-serif'
                                },
                                grid: {
                                    vertLines: { color: '#2B2B43' },
                                    horzLines: { color: '#2B2B43' }
                                },
                                timeScale: {
                                    timeVisible: true,
                                    secondsVisible: false,
                                    rightOffset: 50,
                                    barSpacing: 8,
                                    fixLeftEdge: true,
                                    fixRightEdge: true,
                                    borderColor: '#2B2B43'
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    entireTextOnly: true,
                                    mode: 0,
                                    autoScale: true,
                                    scaleMargins: {
                                        top: 0.1,
                                        bottom: 0.2,
                                    }
                                }
                            });

                            // Initialize RSI chart with same base settings
                            const rsiChart = createChart(document.getElementById('rsi-chart'), {
                                width: 1200,
                                height: 133,
                                layout: {
                                    background: { color: '#1E222D' },
                                    textColor: '#DDD'
                                },
                                grid: {
                                    vertLines: { color: '#2B2B43' },
                                    horzLines: { color: '#2B2B43' }
                                },
                                timeScale: {
                                    visible: false,
                                    rightOffset: 50,
                                    barSpacing: 8,
                                    fixRightEdge: true
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    autoScale: false,
                                    mode: 0,
                                    minValue: 0,
                                    maxValue: 100
                                }
                            });

                            // Initialize ATR chart with same base settings
                            const atrChart = createChart(document.getElementById('atr-chart'), {
                                width: 1200,
                                height: 133,
                                layout: {
                                    background: { color: '#1E222D' },
                                    textColor: '#DDD'
                                },
                                grid: {
                                    vertLines: { color: '#2B2B43' },
                                    horzLines: { color: '#2B2B43' }
                                },
                                timeScale: {
                                    visible: false,
                                    rightOffset: 50,
                                    barSpacing: 8,
                                    fixRightEdge: true
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    autoScale: true
                                }
                            });

                            // Initialize ADX chart with same base settings
                            const adxChart = createChart(document.getElementById('adx-chart'), {
                                width: 1200,
                                height: 133,
                                layout: {
                                    background: { color: '#1E222D' },
                                    textColor: '#DDD'
                                },
                                grid: {
                                    vertLines: { color: '#2B2B43' },
                                    horzLines: { color: '#2B2B43' }
                                },
                                timeScale: {
                                    visible: false,
                                    rightOffset: 50,
                                    barSpacing: 8,
                                    fixRightEdge: true
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    autoScale: false,
                                    mode: 0,
                                    minValue: 0,
                                    maxValue: 100,
                                    scaleMargins: {
                                        top: 0.1,
                                        bottom: 0.1
                                    }
                                }
                            });

                            // Normalize the data
                            const normalizedData = ${candleData}.map(candle => ({
                                ...candle,
                                open: parseFloat(candle.open),
                                high: parseFloat(candle.high),
                                low: parseFloat(candle.low),
                                close: parseFloat(candle.close),
                                value: parseFloat(candle.close)
                            }));

                            // Add candlestick series
                            const candlestickSeries = mainChart.addCandlestickSeries({
                                upColor: '#26a69a',
                                downColor: '#ef5350',
                                borderVisible: false,
                                wickUpColor: '#26a69a',
                                wickDownColor: '#ef5350'
                            });
                            candlestickSeries.setData(normalizedData);

                            // Add EMA20
                            const ema20Series = mainChart.addLineSeries({
                                color: '#2962FF',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            const ema20Data = calculateEMA(normalizedData, 20);
                            ema20Series.setData(ema20Data);

                            // Add EMA50
                            const ema50Series = mainChart.addLineSeries({
                                color: '#FF9800',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            const ema50Data = calculateEMA(normalizedData, 50);
                            ema50Series.setData(ema50Data);

                            // Add RSI data
                            const rsiData = calculateRSI(normalizedData, 14);
                            const rsiSeries = rsiChart.addLineSeries({
                                color: '#2962FF',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            rsiSeries.setData(rsiData);

                            // Add RSI levels
                            const rsiLevels = [
                                { value: 70, color: 'rgba(255, 70, 70, 0.3)' },
                                { value: 30, color: 'rgba(255, 70, 70, 0.3)' }
                            ];

                            rsiLevels.forEach(level => {
                                const levelSeries = rsiChart.addLineSeries({
                                    color: level.color,
                                    lineWidth: 1,
                                    lineStyle: 2,
                                    priceLineVisible: false,
                                    lastValueVisible: false
                                });
                                levelSeries.setData(rsiData.map(d => ({
                                    time: d.time,
                                    value: level.value
                                })));
                            });

                            // Add ATR data
                            const atrData = calculateATR(normalizedData, 14);
                            const atrSeries = atrChart.addLineSeries({
                                color: '#B71C1C',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            atrSeries.setData(atrData);

                            // Add ADX data
                            const adxData = calculateADX(normalizedData, 14);

                            // Create ADX panel legend container
                            const adxLegend = document.createElement('div');
                            adxLegend.style.position = 'absolute';
                            adxLegend.style.top = '5px';
                            adxLegend.style.right = '50px';
                            adxLegend.style.display = 'flex';
                            adxLegend.style.flexDirection = 'column';
                            adxLegend.style.alignItems = 'flex-end';
                            adxLegend.style.gap = '5px';
                            adxLegend.style.zIndex = '2';
                            adxLegend.style.padding = '5px 10px';
                            adxLegend.style.backgroundColor = 'rgba(30, 34, 45, 0.7)';
                            adxLegend.style.borderRadius = '4px';
                            document.getElementById('adx-chart').appendChild(adxLegend);

                            // ADX line
                            const adxSeries = adxChart.addLineSeries({
                                color: '#7B1FA2',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            adxSeries.setData(adxData.adx);

                            // +DI line
                            const plusDiSeries = adxChart.addLineSeries({
                                color: '#26a69a',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            plusDiSeries.setData(adxData.plusDi);

                            // -DI line
                            const minusDiSeries = adxChart.addLineSeries({
                                color: '#ef5350',
                                lineWidth: 2,
                                priceLineVisible: false,
                                lastValueVisible: false
                            });
                            minusDiSeries.setData(adxData.minusDi);

                            // Add ADX component labels
                            const adxComponents = [
                                { name: 'ADX(14)', color: '#7B1FA2', data: adxData.adx },
                                { name: '+DI', color: '#26a69a', data: adxData.plusDi },
                                { name: '-DI', color: '#ef5350', data: adxData.minusDi }
                            ];

                            adxComponents.forEach(component => {
                                const label = document.createElement('div');
                                label.style.color = component.color;
                                label.style.fontSize = '12px';
                                label.style.fontWeight = 'bold';

                                const lastValue = component.data[component.data.length - 1]?.value;
                                label.textContent = lastValue !== undefined
                                    ? component.name + ': ' + lastValue.toFixed(1)
                                    : component.name;

                                adxLegend.appendChild(label);
                            });

                            // Add indicator labels
                            const mainChartLegend = document.createElement('div');
                            mainChartLegend.style.position = 'absolute';
                            mainChartLegend.style.top = '5px';
                            mainChartLegend.style.right = '50px';
                            mainChartLegend.style.display = 'flex';
                            mainChartLegend.style.flexDirection = 'column';
                            mainChartLegend.style.alignItems = 'flex-end';
                            mainChartLegend.style.gap = '5px';
                            mainChartLegend.style.zIndex = '2';
                            mainChartLegend.style.padding = '5px 10px';
                            mainChartLegend.style.backgroundColor = 'rgba(30, 34, 45, 0.7)';
                            mainChartLegend.style.borderRadius = '4px';
                            document.getElementById('main-chart').appendChild(mainChartLegend);

                            // Add EMA labels to main chart legend
                            ['EMA20', 'EMA50'].forEach((ema, idx) => {
                                const label = document.createElement('div');
                                label.style.color = idx === 0 ? '#2962FF' : '#FF9800';
                                label.style.fontSize = '12px';
                                label.style.fontWeight = 'bold';
                                label.textContent = ema;
                                mainChartLegend.appendChild(label);
                            });

                            // Add indicator labels for RSI, ATR, ADX panels
                            const indicators = [
                                { name: 'RSI(14)', color: '#2962FF', data: rsiData, precision: 1 },
                                { name: 'ATR(14)', color: '#B71C1C', data: atrData, precision: 5 },
                                { name: 'ADX(14)', color: '#7B1FA2', data: adxData.adx, precision: 1 }
                            ];

                            indicators.forEach((indicator, idx) => {
                                const label = document.createElement('div');
                                label.style.position = 'absolute';
                                label.style.top = '5px';
                                label.style.right = '50px';
                                label.style.color = indicator.color;
                                label.style.fontSize = '12px';
                                label.style.fontWeight = 'bold';
                                label.style.zIndex = '1';
                                label.style.padding = '5px 10px';
                                label.style.backgroundColor = 'rgba(30, 34, 45, 0.7)';
                                label.style.borderRadius = '4px';

                                const lastValue = indicator.data[indicator.data.length - 1]?.value;
                                label.textContent = lastValue !== undefined
                                    ? indicator.name + ': ' + lastValue.toFixed(indicator.precision)
                                    : indicator.name;

                                const targetId = idx === 0 ? 'rsi-chart' : (idx === 1 ? 'atr-chart' : 'adx-chart');
                                document.getElementById(targetId)?.appendChild(label);
                            });

                            // Synchronize all charts
                            mainChart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
                                if (timeRange !== null) {
                                    [rsiChart, atrChart, adxChart].forEach(chart => {
                                        chart.timeScale().setVisibleRange(timeRange);
                                    });
                                }
                            });

                            // Final synchronization
                            [mainChart, rsiChart, atrChart, adxChart].forEach(chart => {
                                chart.timeScale().fitContent();
                            });

                            // Additional wait for final rendering
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Signal completion
                            window.chartsReady = true;
                            console.log('Charts initialized successfully');

                            // Final position and zoom adjustment
                            [mainChart, rsiChart, atrChart, adxChart].forEach(chart => {
                                chart.timeScale().scrollToPosition(-50, false);
                            });
                        } catch (error) {
                            console.error('Error initializing charts:', error);
                            window.chartError = error.message;
                        }
                    }

                    // Helper function to calculate EMA
                    function calculateEMA(candles, period) {
                        const k = 2 / (period + 1);
                        let ema = candles[0].close;

                        return candles.map(candle => {
                            ema = candle.close * k + ema * (1 - k);
                            return {
                                time: candle.time,
                                value: ema
                            };
                        });
                    }

                    // Helper function to calculate RSI
                    function calculateRSI(candles, period) {
                        let gains = [];
                        let losses = [];

                        // Calculate price changes and separate into gains and losses
                        for (let i = 1; i < candles.length; i++) {
                            const change = candles[i].close - candles[i-1].close;
                            gains.push(change > 0 ? change : 0);
                            losses.push(change < 0 ? -change : 0);
                        }

                        // Calculate initial averages
                        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
                        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

                        const rsiData = [];

                        // Calculate first RSI
                        let rsi = 100 - (100 / (1 + avgGain / avgLoss));
                        rsiData.push({
                            time: candles[period].time,
                            value: rsi
                        });

                        // Calculate remaining RSIs
                        for (let i = period + 1; i < candles.length; i++) {
                            avgGain = ((avgGain * (period - 1)) + gains[i-1]) / period;
                            avgLoss = ((avgLoss * (period - 1)) + losses[i-1]) / period;

                            rsi = 100 - (100 / (1 + avgGain / avgLoss));
                            rsiData.push({
                                time: candles[i].time,
                                value: rsi
                            });
                        }

                        return rsiData;
                    }

                    // Helper function to calculate ATR
                    function calculateATR(candles, period) {
                        const trueRanges = [];
                        let prevClose = candles[0].close;

                        // Calculate True Ranges
                        for (let i = 1; i < candles.length; i++) {
                            const high = candles[i].high;
                            const low = candles[i].low;
                            const close = candles[i].close;

                            const tr1 = Math.abs(high - low);
                            const tr2 = Math.abs(high - prevClose);
                            const tr3 = Math.abs(low - prevClose);

                            const trueRange = Math.max(tr1, tr2, tr3);
                            trueRanges.push(trueRange);
                            prevClose = close;
                        }

                        // Calculate initial ATR
                        let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
                        const atrData = [];

                        // First ATR value
                        atrData.push({
                            time: candles[period].time,
                            value: atr
                        });

                        // Calculate remaining ATRs
                        for (let i = period; i < trueRanges.length; i++) {
                            atr = ((atr * (period - 1)) + trueRanges[i]) / period;
                            atrData.push({
                                time: candles[i + 1].time,
                                value: atr
                            });
                        }

                        return atrData;
                    }

                    // Helper function to calculate ADX
                    function calculateADX(candles, period) {
                        const tr = [];
                        const plusDM = [];
                        const minusDM = [];

                        // Calculate True Range and Directional Movement
                        for (let i = 1; i < candles.length; i++) {
                            const high = candles[i].high;
                            const low = candles[i].low;
                            const prevHigh = candles[i-1].high;
                            const prevLow = candles[i-1].low;
                            const prevClose = candles[i-1].close;

                            // True Range
                            const tr1 = Math.abs(high - low);
                            const tr2 = Math.abs(high - prevClose);
                            const tr3 = Math.abs(low - prevClose);
                            tr.push(Math.max(tr1, tr2, tr3));

                            // Directional Movement
                            const upMove = high - prevHigh;
                            const downMove = prevLow - low;

                            if (upMove > downMove && upMove > 0) {
                                plusDM.push(upMove);
                            } else {
                                plusDM.push(0);
                            }

                            if (downMove > upMove && downMove > 0) {
                                minusDM.push(downMove);
                            } else {
                                minusDM.push(0);
                            }
                        }

                        // Calculate smoothed TR and DM
                        let smoothedTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
                        let smoothedPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
                        let smoothedMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);

                        const adxData = [];
                        const plusDiData = [];
                        const minusDiData = [];

                        // Calculate first DI values
                        let plusDI = (smoothedPlusDM / smoothedTR) * 100;
                        let minusDI = (smoothedMinusDM / smoothedTR) * 100;
                        let dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

                        plusDiData.push({
                            time: candles[period].time,
                            value: plusDI
                        });

                        minusDiData.push({
                            time: candles[period].time,
                            value: minusDI
                        });

                        adxData.push({
                            time: candles[period].time,
                            value: dx
                        });

                        // Calculate remaining values
                        let adx = dx;
                        for (let i = period + 1; i < candles.length; i++) {
                            smoothedTR = smoothedTR - (smoothedTR / period) + tr[i - 1];
                            smoothedPlusDM = smoothedPlusDM - (smoothedPlusDM / period) + plusDM[i - 1];
                            smoothedMinusDM = smoothedMinusDM - (smoothedMinusDM / period) + minusDM[i - 1];

                            plusDI = (smoothedPlusDM / smoothedTR) * 100;
                            minusDI = (smoothedMinusDM / smoothedTR) * 100;
                            dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
                            adx = ((adx * (period - 1)) + dx) / period;

                            plusDiData.push({
                                time: candles[i].time,
                                value: plusDI
                            });

                            minusDiData.push({
                                time: candles[i].time,
                                value: minusDI
                            });

                            adxData.push({
                                time: candles[i].time,
                                value: adx
                            });
                        }

                        return {
                            adx: adxData,
                            plusDi: plusDiData,
                            minusDi: minusDiData
                        };
                    }

                    // Start chart initialization
                    initializeCharts().catch(error => {
                        console.error('Failed to initialize charts:', error);
                        window.chartError = error.message;
                    });
                </script>
            </body>
            </html>
        `;
  }
}
