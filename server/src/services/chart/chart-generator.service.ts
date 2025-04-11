import { createLogger } from "../../utils/logger";
import { ChartOptions } from "lightweight-charts";
import { getChartOptions } from "./chart-config.service";
import { CapitalService } from "../broker/capital-com/capital.service";
import { Candle } from "../broker/interfaces/types";
import { IndicatorsService } from "./indicators.service";
import { ChartRendererService } from "./chart-renderer.service";
import { StorageService } from "../storage/storage.service";

const logger = createLogger("chart-generator");

export interface ChartData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GeneratedChart {
  url: string;
  data: ChartData[];
  indicators: Record<string, number[]>;
}

export interface ChartGeneratorOptions {
  userId: string;
  signalId: string;
}

export class ChartGeneratorService {
  private capitalService: CapitalService;
  private indicatorsService: IndicatorsService;
  private chartRenderer: ChartRendererService;
  private storageService: StorageService;

  constructor(capitalService: CapitalService, storageService: StorageService) {
    this.capitalService = capitalService;
    this.indicatorsService = new IndicatorsService();
    this.chartRenderer = new ChartRendererService();
    this.storageService = storageService;
  }

  /**
   * Generate a chart for analysis
   */
  async generateChart(pair: string, timeframe: string, options: ChartGeneratorOptions): Promise<GeneratedChart> {
    try {
      // Get chart data from market data service
      const data = await this.fetchMarketData(pair, timeframe);

      // Calculate indicators
      const indicators = await this.calculateIndicators(data);

      // Generate chart image
      const chartUrl = await this.renderChart(data, indicators, pair, timeframe, options);

      return {
        url: chartUrl,
        data,
        indicators,
      };
    } catch (error) {
      logger.error("Error generating chart:", error);
      throw new Error("Failed to generate chart for analysis");
    }
  }

  /**
   * Fetch market data for the given pair and timeframe
   */
  private async fetchMarketData(pair: string, timeframe: string): Promise<ChartData[]> {
    try {
      // Ensure we're connected to the broker
      if (!this.capitalService.isConnected()) {
        throw new Error("Not connected to broker");
      }

      // Get candles from Capital.com
      const candles = await this.capitalService.getCandles(pair, timeframe, 200);

      // Map candles to ChartData format
      return candles.map((candle: Candle) => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0,
      }));
    } catch (error) {
      logger.error("Error fetching market data:", error);
      throw error;
    }
  }

  /**
   * Calculate technical indicators for the chart
   */
  private async calculateIndicators(data: ChartData[]): Promise<Record<string, number[]>> {
    try {
      return this.indicatorsService.calculateAllIndicators(data);
    } catch (error) {
      logger.error("Error calculating indicators:", error);
      throw error;
    }
  }

  /**
   * Render chart to image and store it
   */
  private async renderChart(
    data: ChartData[],
    indicators: Record<string, number[]>,
    pair: string,
    timeframe: string,
    options: ChartGeneratorOptions
  ): Promise<string> {
    try {
      // Generate chart image
      const chartBuffer = await this.chartRenderer.renderChart(data, indicators);

      // Upload chart image
      const result = await this.storageService.uploadChartImage(chartBuffer, {
        userId: options.userId,
        signalId: options.signalId,
        timeframe,
        chartType: "analysis",
      });

      return result.url;
    } catch (error) {
      logger.error("Error rendering chart:", error);
      throw error;
    }
  }
}
