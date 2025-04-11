import { createLogger } from "../../utils/logger";
import { createCanvas, CanvasRenderingContext2D } from "canvas";
import { ChartData } from "./chart-generator.service";

const logger = createLogger("chart-renderer");

interface ChartDimensions {
  width: number;
  height: number;
  padding: number;
  priceHeight: number;
  volumeHeight: number;
  indicatorHeight: number;
}

interface ChartScales {
  xScale: (timestamp: number) => number;
  priceScale: (price: number) => number;
  volumeScale: (volume: number) => number;
  indicatorScale: (value: number, min: number, max: number) => number;
}

export class ChartRendererService {
  private readonly dimensions: ChartDimensions = {
    width: 1200,
    height: 800,
    padding: 50,
    priceHeight: 400,
    volumeHeight: 100,
    indicatorHeight: 100,
  };

  /**
   * Render a chart with price, volume, and indicators
   */
  async renderChart(data: ChartData[], indicators: Record<string, number[]>): Promise<Buffer> {
    try {
      // Create canvas
      const canvas = createCanvas(this.dimensions.width, this.dimensions.height);
      const ctx = canvas.getContext("2d");

      // Set background
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, this.dimensions.width, this.dimensions.height);

      // Calculate scales
      const scales = this.createScales(data);

      // Draw chart components
      this.drawPriceChart(ctx, data, scales);
      this.drawVolumeChart(ctx, data, scales);
      this.drawIndicators(ctx, data, indicators, scales);
      this.drawGrid(ctx, data, scales);
      this.drawAxes(ctx, data, scales);

      // Return image buffer
      return canvas.toBuffer("image/png");
    } catch (error) {
      logger.error("Error rendering chart:", error);
      throw error;
    }
  }

  /**
   * Create scaling functions for the chart
   */
  private createScales(data: ChartData[]): ChartScales {
    const { width, height, padding } = this.dimensions;
    const chartWidth = width - padding * 2;

    // X scale (time)
    const xScale = (timestamp: number): number => {
      const minTime = Math.min(...data.map((d) => d.timestamp));
      const maxTime = Math.max(...data.map((d) => d.timestamp));
      return padding + ((timestamp - minTime) / (maxTime - minTime)) * chartWidth;
    };

    // Price scale
    const minPrice = Math.min(...data.map((d) => d.low));
    const maxPrice = Math.max(...data.map((d) => d.high));
    const priceScale = (price: number): number => {
      return padding + ((maxPrice - price) / (maxPrice - minPrice)) * this.dimensions.priceHeight;
    };

    // Volume scale
    const maxVolume = Math.max(...data.map((d) => d.volume));
    const volumeScale = (volume: number): number => {
      const volumeY = padding + this.dimensions.priceHeight + 50;
      return volumeY + (1 - volume / maxVolume) * this.dimensions.volumeHeight;
    };

    // Generic indicator scale
    const indicatorScale = (value: number, min: number, max: number): number => {
      const indicatorY = padding + this.dimensions.priceHeight + this.dimensions.volumeHeight + 100;
      return indicatorY + ((max - value) / (max - min)) * this.dimensions.indicatorHeight;
    };

    return { xScale, priceScale, volumeScale, indicatorScale };
  }

  /**
   * Draw the price chart (candlesticks)
   */
  private drawPriceChart(ctx: CanvasRenderingContext2D, data: ChartData[], scales: ChartScales): void {
    const { xScale, priceScale } = scales;
    const candleWidth = 6;

    data.forEach((candle) => {
      const x = xScale(candle.timestamp);
      const openY = priceScale(candle.open);
      const closeY = priceScale(candle.close);
      const highY = priceScale(candle.high);
      const lowY = priceScale(candle.low);

      // Draw candle body
      ctx.fillStyle = candle.close > candle.open ? "#4CAF50" : "#FF5252";
      ctx.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, Math.abs(closeY - openY));

      // Draw wicks
      ctx.strokeStyle = candle.close > candle.open ? "#4CAF50" : "#FF5252";
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, Math.min(openY, closeY));
      ctx.moveTo(x, Math.max(openY, closeY));
      ctx.lineTo(x, lowY);
      ctx.stroke();
    });
  }

  /**
   * Draw the volume chart
   */
  private drawVolumeChart(ctx: CanvasRenderingContext2D, data: ChartData[], scales: ChartScales): void {
    const { xScale, volumeScale } = scales;
    const barWidth = 6;

    data.forEach((candle) => {
      const x = xScale(candle.timestamp);
      const y = volumeScale(candle.volume);
      const height = this.dimensions.height - y;

      ctx.fillStyle = candle.close > candle.open ? "#4CAF5080" : "#FF525280";
      ctx.fillRect(x - barWidth / 2, y, barWidth, height);
    });
  }

  /**
   * Draw technical indicators
   */
  private drawIndicators(ctx: CanvasRenderingContext2D, data: ChartData[], indicators: Record<string, number[]>, scales: ChartScales): void {
    const { xScale } = scales;

    // Draw moving averages on price chart
    if (indicators.ema20) {
      this.drawLine(ctx, data, indicators.ema20, xScale, scales.priceScale, "#FFD700");
    }
    if (indicators.sma50) {
      this.drawLine(ctx, data, indicators.sma50, xScale, scales.priceScale, "#2196F3");
    }
    if (indicators.sma200) {
      this.drawLine(ctx, data, indicators.sma200, xScale, scales.priceScale, "#9C27B0");
    }

    // Draw RSI
    if (indicators.rsi14) {
      const rsiScale = (value: number) => scales.indicatorScale(value, 0, 100);
      this.drawLine(ctx, data, indicators.rsi14, xScale, rsiScale, "#FF9800");

      // Draw RSI levels
      ctx.strokeStyle = "#666666";
      ctx.setLineDash([5, 5]);
      [30, 70].forEach((level) => {
        const y = rsiScale(level);
        ctx.beginPath();
        ctx.moveTo(this.dimensions.padding, y);
        ctx.lineTo(this.dimensions.width - this.dimensions.padding, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }
  }

  /**
   * Draw a line on the chart
   */
  private drawLine(ctx: CanvasRenderingContext2D, data: ChartData[], values: number[], xScale: (t: number) => number, yScale: (v: number) => number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();

    data.forEach((candle, i) => {
      const x = xScale(candle.timestamp);
      const y = yScale(values[i]);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  /**
   * Draw grid lines
   */
  private drawGrid(ctx: CanvasRenderingContext2D, data: ChartData[], scales: ChartScales): void {
    const { width, height, padding } = this.dimensions;
    ctx.strokeStyle = "#333333";
    ctx.lineWidth = 1;

    // Vertical grid lines (time)
    const timeIntervals = 8;
    for (let i = 0; i <= timeIntervals; i++) {
      const x = padding + ((width - padding * 2) * i) / timeIntervals;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal grid lines (price)
    const priceIntervals = 6;
    for (let i = 0; i <= priceIntervals; i++) {
      const y = padding + ((height - padding * 2) * i) / priceIntervals;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
  }

  /**
   * Draw chart axes
   */
  private drawAxes(ctx: CanvasRenderingContext2D, data: ChartData[], scales: ChartScales): void {
    const { width, height, padding } = this.dimensions;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "12px Arial";

    // Time axis
    const timeIntervals = 8;
    for (let i = 0; i <= timeIntervals; i++) {
      const timestamp = data[Math.floor((data.length * i) / timeIntervals)]?.timestamp;
      if (timestamp) {
        const x = padding + ((width - padding * 2) * i) / timeIntervals;
        const date = new Date(timestamp);
        ctx.fillText(date.toLocaleDateString(), x - 30, height - padding + 20);
      }
    }

    // Price axis
    const priceIntervals = 6;
    const minPrice = Math.min(...data.map((d) => d.low));
    const maxPrice = Math.max(...data.map((d) => d.high));
    for (let i = 0; i <= priceIntervals; i++) {
      const price = minPrice + ((maxPrice - minPrice) * i) / priceIntervals;
      const y = scales.priceScale(price);
      ctx.fillText(price.toFixed(4), width - padding + 10, y + 4);
    }
  }
}
