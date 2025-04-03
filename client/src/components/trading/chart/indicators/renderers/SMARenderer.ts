"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateSMA } from "../calculations/sma";

/**
 * SMA Renderer Options
 */
export interface SMARendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    period?: number;
  };
}

/**
 * SMA Indicator Renderer
 *
 * Implements the Simple Moving Average indicator
 */
export class SMARenderer extends IndicatorBase {
  private lineSeries: ISeriesApi<"Line"> | null = null;

  /**
   * Create a new SMA renderer
   */
  constructor(options: SMARendererOptions) {
    super({
      ...options,
      name: options.name || `SMA (${options.parameters.period || 20})`,
      type: "SMA",
    });
  }

  /**
   * Create the SMA series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 20;

      // Log creation
      console.log(`[SMA] Creating SMA series for ${this.config.id} in pane ${paneIndex}`);

      // Create the SMA line series directly using the chart's addSeries method
      this.lineSeries = this.chart.addSeries(
        LineSeries,
        {
          color: this.config.color,
          lineWidth: 2,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 5,
            minMove: 0.00001,
          },
          title: `SMA (${period})`,
          priceScaleId: "left",
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          priceLineVisible: true,
          priceLineSource: 1,
          priceLineWidth: 1,
          priceLineColor: this.config.color,
          baseLineVisible: false,
          lastPriceAnimation: 0,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      if (this.lineSeries) {
        // Configure the price scale
        const priceScale = this.lineSeries.priceScale();
        priceScale.applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          visible: true,
          borderVisible: true,
          borderColor: "rgba(197, 203, 206, 0.3)",
          autoScale: true,
          entireTextOnly: false,
          alignLabels: true,
          textColor: "rgba(255, 255, 255, 0.5)",
        });
      }

      // Store reference for later
      this.mainSeries = this.lineSeries;

      // Update config to store series reference
      this.config.series = this.lineSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[SMA] Successfully created SMA series for ${this.config.id}`);

      return this.lineSeries;
    } catch (error) {
      console.error(`[SMA] Error creating SMA series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update SMA data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.lineSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const period = (this.config.parameters.period as number) || 20;

      // Calculate SMA data
      const smaData = calculateSMA(candles, period);

      // Set the data for the line series
      this.lineSeries.setData(smaData);

      // Apply autoscale settings for better visualization
      if (this.lineSeries && typeof this.lineSeries.priceScale === "function") {
        const priceScale = this.lineSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        });
      }
    } catch (error) {
      console.error(`[SMA] Error updating SMA data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    return 0; // SMA goes on the main price chart (pane 0)
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
