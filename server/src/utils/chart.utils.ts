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
