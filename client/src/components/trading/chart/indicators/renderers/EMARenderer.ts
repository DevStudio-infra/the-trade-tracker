"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateEMA } from "../calculations/ema";

/**
 * EMA Renderer Options
 */
export interface EMARendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    period?: number;
  };
}

/**
 * EMA Indicator Renderer
 *
 * Implements the Exponential Moving Average indicator
 */
export class EMARenderer extends IndicatorBase {
  private lineSeries: ISeriesApi<"Line"> | null = null;

  /**
   * Create a new EMA renderer
   */
  constructor(options: EMARendererOptions) {
    super({
      ...options,
      name: options.name || `EMA (${options.parameters.period || 20})`,
      type: "EMA",
    });
  }

  /**
   * Create the EMA series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 20;

      // Log creation
      console.log(`[EMA] Creating EMA series for ${this.config.id} in pane ${paneIndex}`);

      // Create the EMA line series
      this.lineSeries = this.createStandardSeries(
        LineSeries,
        {
          color: this.config.color,
          lineWidth: 2,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 4,
            minMove: 0.0001,
          },
          title: `EMA (${period})`,
        },
        paneIndex
      ) as ISeriesApi<"Line"> | null;

      // Store reference for later
      this.mainSeries = this.lineSeries;

      // Update config to store series reference
      this.config.series = this.lineSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[EMA] Successfully created EMA series for ${this.config.id}`);

      return this.lineSeries;
    } catch (error) {
      console.error(`[EMA] Error creating EMA series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update EMA data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.lineSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const period = (this.config.parameters.period as number) || 20;

      // Calculate EMA data
      const emaData = calculateEMA(candles, period);

      // Set the data for the line series
      this.lineSeries.setData(emaData);

      // Apply autoscale settings for better visualization
      if (this.lineSeries && typeof this.lineSeries.priceScale === "function") {
        const priceScale = this.lineSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
        });
      }
    } catch (error) {
      console.error(`[EMA] Error updating EMA data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    return 0; // EMA goes on the main price chart (pane 0)
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    return {
      period: 20,
    };
  }
}
