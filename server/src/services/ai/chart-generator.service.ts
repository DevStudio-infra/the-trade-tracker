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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-web-security", "--disable-features=IsolateOrigins,site-per-process"],
    });

    try {
      console.log("Initializing chart generation...");
      console.log(`Candles received: ${candles.length}`);

      const page = await browser.newPage();

      // Set viewport size
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1,
      });

      // Create HTML content with chart
      const html = this.createChartHtml(candles, options);
      await page.setContent(html);

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
          // Check every 100ms if charts are ready
          const checkInterval = setInterval(() => {
            const win = window as Window;
            if (win.chartError) {
              clearInterval(checkInterval);
              clearTimeout(timeout);
              resolve({ success: false, error: win.chartError });
            }

            if (win.chartsReady) {
              const mainChart = document.querySelector("#main-chart canvas") as HTMLCanvasElement | null;
              const volumeChart = document.querySelector("#volume-chart canvas") as HTMLCanvasElement | null;
              const rsiChart = document.querySelector("#rsi-chart canvas") as HTMLCanvasElement | null;
              const atrChart = document.querySelector("#atr-chart canvas") as HTMLCanvasElement | null;

              if (mainChart && volumeChart && rsiChart && atrChart) {
                const mainCtx = mainChart.getContext("2d");
                const volumeCtx = volumeChart.getContext("2d");
                const rsiCtx = rsiChart.getContext("2d");
                const atrCtx = atrChart.getContext("2d");

                if (mainCtx && volumeCtx && rsiCtx && atrCtx) {
                  const mainData = mainCtx.getImageData(0, 0, mainChart.width, mainChart.height);
                  const volumeData = volumeCtx.getImageData(0, 0, volumeChart.width, volumeChart.height);
                  const rsiData = rsiCtx.getImageData(0, 0, rsiChart.width, rsiChart.height);
                  const atrData = atrCtx.getImageData(0, 0, atrChart.width, atrChart.height);

                  // Check if all canvases have been drawn to
                  const hasMainContent = mainData.data.some((pixel) => pixel !== 0);
                  const hasVolumeContent = volumeData.data.some((pixel) => pixel !== 0);
                  const hasRsiContent = rsiData.data.some((pixel) => pixel !== 0);
                  const hasAtrContent = atrData.data.some((pixel) => pixel !== 0);

                  if (hasMainContent && hasVolumeContent && hasRsiContent && hasAtrContent) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    resolve({ success: true });
                  }
                }
              }
            }
          }, 100);

          // Increase timeout to 20 seconds for initial rendering
          const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            resolve({ success: false, error: "Chart rendering timed out" });
          }, 20000);
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
                        window.onLightweightChartsLoad = resolve;
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
                        height: 450px;
                        background: #1E222D;
                    }
                    #volume-chart {
                        position: absolute;
                        top: 450px;
                        left: 0;
                        width: 1200px;
                        height: 100px;
                        background: #1E222D;
                    }
                    #rsi-chart {
                        position: absolute;
                        top: 550px;
                        left: 0;
                        width: 1200px;
                        height: 125px;
                        background: #1E222D;
                    }
                    #atr-chart {
                        position: absolute;
                        top: 675px;
                        left: 0;
                        width: 1200px;
                        height: 125px;
                        background: #1E222D;
                    }
                </style>
            </head>
            <body>
                <div id="chart-container">
                    <div id="main-chart"></div>
                    <div id="volume-chart"></div>
                    <div id="rsi-chart"></div>
                    <div id="atr-chart"></div>
                </div>
                <script>
                    // Wait for LightweightCharts to be available
                    async function waitForCharts() {
                        try {
                            await window.lightweightChartsLoaded;
                            if (typeof window.LightweightCharts === 'undefined') {
                                throw new Error('LightweightCharts not found after load');
                            }
                            return window.LightweightCharts;
                        } catch (error) {
                            window.chartError = error.message;
                            throw error;
                        }
                    }

                    // Initialize charts
                    async function initializeCharts() {
                        try {
                            console.log('Waiting for LightweightCharts to load...');
                            const { createChart } = await waitForCharts();
                            console.log('LightweightCharts loaded successfully');

                            // Create charts synchronously
                            const mainChart = createChart(document.getElementById('main-chart'), {
                                width: 1200,
                                height: 450,
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
                                    rightOffset: 12,
                                    barSpacing: 12,
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
                                        bottom: 0.1,
                                    },
                                    ticksVisible: true,
                                    priceFormat: {
                                        type: 'custom',
                                        formatter: (price) => price.toFixed(5),
                                        minMove: 0.00001,
                                    },
                                }
                            });

                            // Normalize the data first
                            const normalizedData = ${candleData}.map(candle => ({
                                ...candle,
                                open: parseFloat(candle.open),
                                high: parseFloat(candle.high),
                                low: parseFloat(candle.low),
                                close: parseFloat(candle.close),
                                value: parseFloat(candle.close),
                                volume: parseFloat(candle.volume)
                            }));

                            // Add candlestick series first
                            const candlestickSeries = mainChart.addCandlestickSeries({
                                upColor: '#26a69a',
                                downColor: '#ef5350',
                                borderVisible: false,
                                wickUpColor: '#26a69a',
                                wickDownColor: '#ef5350'
                            });
                            candlestickSeries.setData(normalizedData);

                            // Add EMAs if requested
                            if (${JSON.stringify(options.indicators)}.includes('EMA20')) {
                                const ema20Series = mainChart.addLineSeries({
                                    color: '#2962FF',
                                    lineWidth: 2,
                                    title: 'EMA 20'
                                });
                                const ema20Data = calculateEMA(normalizedData, 20);
                                ema20Series.setData(ema20Data);
                            }

                            // Create and populate volume chart
                            const volumeChart = createChart(document.getElementById('volume-chart'), {
                                width: 1200,
                                height: 100,
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
                                    barSpacing: 12
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    scaleMargins: {
                                        top: 0.2,
                                        bottom: 0.2,
                                    },
                                    autoScale: true,
                                    alignLabels: true
                                }
                            });

                            // Calculate volume data with proper scaling
                            const volumeData = normalizedData.map(candle => {
                                const color = candle.close >= candle.open ? '#26a69a40' : '#ef535040';
                                return {
                                    time: candle.time,
                                    value: candle.volume,
                                    color
                                };
                            });

                            // Create volume series with proper configuration
                            const volumeSeries = volumeChart.addHistogramSeries({
                                priceFormat: {
                                    type: 'volume',
                                    precision: 0,
                                },
                                priceScaleId: 'right',
                                scaleMargins: {
                                    top: 0.2,
                                    bottom: 0.2,
                                },
                                color: 'rgba(38, 166, 154, 0.5)'  // Default color (will be overridden by individual bars)
                            });

                            // Set volume data after configuration
                            volumeSeries.setData(volumeData);

                            // Wait for initial render
                            await new Promise(resolve => setTimeout(resolve, 100));

                            // Create and populate RSI chart with overbought/oversold lines
                            const rsiChart = createChart(document.getElementById('rsi-chart'), {
                                width: 1200,
                                height: 125,
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
                                    barSpacing: 12
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    scaleMargins: {
                                        top: 0.1,
                                        bottom: 0.1,
                                    },
                                    autoScale: false,
                                    mode: 0,
                                    ticksVisible: true,
                                    minValue: 0,
                                    maxValue: 100
                                }
                            });

                            // Add RSI overbought/oversold lines first
                            const rsiUpperLine = rsiChart.addLineSeries({
                                color: 'rgba(255, 70, 70, 0.3)',
                                lineWidth: 1,
                                lineStyle: 2,
                                priceFormat: {
                                    type: 'custom',
                                    minMove: 1,
                                    formatter: (price) => price.toFixed(0)
                                }
                            });

                            const rsiLowerLine = rsiChart.addLineSeries({
                                color: 'rgba(255, 70, 70, 0.3)',
                                lineWidth: 1,
                                lineStyle: 2,
                                priceFormat: {
                                    type: 'custom',
                                    minMove: 1,
                                    formatter: (price) => price.toFixed(0)
                                }
                            });

                            // Calculate RSI data
                            const rsiData = calculateRSI(normalizedData, 14);
                            const overboughtData = rsiData.map(d => ({ time: d.time, value: 70 }));
                            const oversoldData = rsiData.map(d => ({ time: d.time, value: 30 }));

                            // Set RSI lines data
                            rsiUpperLine.setData(overboughtData);
                            rsiLowerLine.setData(oversoldData);

                            // Add main RSI line
                            const rsiSeries = rsiChart.addLineSeries({
                                color: '#2962FF',
                                lineWidth: 2,
                                priceFormat: {
                                    type: 'custom',
                                    minMove: 0.01,
                                    formatter: (price) => price.toFixed(1)
                                }
                            });

                            // Set RSI data
                            rsiSeries.setData(rsiData);

                            // Wait for RSI render
                            await new Promise(resolve => setTimeout(resolve, 100));

                            // Create and populate ATR chart
                            const atrChart = createChart(document.getElementById('atr-chart'), {
                                width: 1200,
                                height: 125,
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
                                    barSpacing: 12
                                },
                                rightPriceScale: {
                                    visible: true,
                                    borderColor: '#2B2B43',
                                    scaleMargins: {
                                        top: 0.1,
                                        bottom: 0.1,
                                    },
                                    autoScale: true,
                                    alignLabels: true
                                }
                            });

                            // Calculate ATR data
                            const atrData = calculateATR(normalizedData, 14);

                            // Add ATR line
                            const atrSeries = atrChart.addLineSeries({
                                color: '#B71C1C',
                                lineWidth: 2,
                                priceFormat: {
                                    type: 'custom',
                                    formatter: (price) => price.toFixed(5),
                                    minMove: 0.00001
                                }
                            });

                            // Set ATR data
                            atrSeries.setData(atrData);

                            // Wait for ATR render
                            await new Promise(resolve => setTimeout(resolve, 100));

                            // Add indicator titles with current values
                            interface IndicatorConfig {
                                name: string;
                                color: string;
                                data: Array<{ time: number; value: number }>;
                                precision: number;
                            }

                            const indicators: IndicatorConfig[] = [
                                { name: 'Volume', color: '#787B86', data: volumeData, precision: 0 },
                                { name: 'RSI(14)', color: '#2962FF', data: rsiData, precision: 1 },
                                { name: 'ATR(14)', color: '#B71C1C', data: atrData, precision: 5 }
                            ];

                            indicators.forEach((indicator, idx) => {
                                const titleDiv = document.createElement('div');
                                titleDiv.style.position = 'absolute';
                                titleDiv.style.top = '5px';
                                titleDiv.style.left = '10px';
                                titleDiv.style.color = indicator.color;
                                titleDiv.style.fontSize = '12px';
                                titleDiv.style.fontWeight = 'bold';
                                titleDiv.style.zIndex = '1';

                                const lastValue = indicator.data[indicator.data.length - 1]?.value;
                                const displayText = lastValue !== undefined
                                    ? indicator.name + ': ' + lastValue.toFixed(indicator.precision)
                                    : indicator.name;

                                titleDiv.textContent = displayText;

                                const targetId = idx === 0 ? 'volume-chart' : (idx === 1 ? 'rsi-chart' : 'atr-chart');
                                const targetElement = document.getElementById(targetId);
                                if (targetElement) {
                                    targetElement.appendChild(titleDiv);
                                }
                            });

                            // Synchronize all charts
                            mainChart.timeScale().subscribeVisibleTimeRangeChange(timeRange => {
                                if (timeRange !== null) {
                                    [volumeChart, rsiChart, atrChart].forEach(chart => {
                                        chart.timeScale().setVisibleRange(timeRange);
                                    });
                                }
                            });

                            // Fit content and set scroll position
                            [mainChart, volumeChart, rsiChart, atrChart].forEach(chart => {
                                chart.timeScale().fitContent();
                                chart.timeScale().scrollToPosition(-12, false);
                            });

                            // Signal that charts are ready
                            window.chartsReady = true;
                            console.log('Charts initialized successfully');
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
