"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { FormattedCandle, IndicatorParameters } from "../../../chart/core/ChartTypes";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { calculateATR } from "../calculations/atr";

/**
 * ATR Renderer Options
 */
export interface ATRRendererOptions extends BaseIndicatorOptions {
  parameters: IndicatorParameters & {
    period?: number;
  };
}

/**
 * ATR Indicator Renderer
 *
 * Implements the Average True Range indicator
 */
export class ATRRenderer extends IndicatorBase {
  private lineSeries: ISeriesApi<"Line"> | null = null;
  private priceScaleId: string;

  /**
   * Create a new ATR renderer
   */
  constructor(options: ATRRendererOptions) {
    super({
      ...options,
      name: options.name || `ATR (${options.parameters.period || 14})`,
      type: "ATR",
    });
    this.priceScaleId = `atr-scale-${options.id}`;
  }

  /**
   * Create the ATR series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 14;

      // Log creation
      console.log(`[ATR] Creating ATR series for ${this.config.id} in pane ${paneIndex}`);

      // Create the ATR line series
      this.lineSeries = this.chart.addSeries(
        LineSeries,
        {
          color: this.config.color,
          // We use `any` here because the types in lightweight-charts are inconsistent
          // between different versions. In v3, lineWidth is a number, but in v4+ it's an object.
          lineWidth: 2 as any,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 6,
            minMove: 0.000001,
          },
          title: `ATR (${period})`,
          priceScaleId: this.priceScaleId,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Store reference for later
      this.mainSeries = this.lineSeries;

      // Update config to store series reference
      this.config.series = this.lineSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[ATR] Successfully created ATR series for ${this.config.id}`);

      return this.lineSeries;
    } catch (error) {
      console.error(`[ATR] Error creating ATR series for ${this.config.id}:`, error);
      return null;
    }
  }

  /**
   * Update ATR data
   */
  updateData(candles: FormattedCandle[]): void {
    if (!this.lineSeries || candles.length === 0) {
      return;
    }

    try {
      // Extract parameters with defaults
      const period = (this.config.parameters.period as number) || 14;

      // Calculate ATR data
      const atrData = calculateATR(candles, period);

      // Set the data for the line series
      this.lineSeries.setData(atrData);

      // Apply autoscale settings for better visualization
      if (this.lineSeries && typeof this.lineSeries.priceScale === "function") {
        const priceScale = this.lineSeries.priceScale();
        priceScale.applyOptions({
          autoScale: true,
          mode: 0,
        });
      }
    } catch (error) {
      console.error(`[ATR] Error updating ATR data for ${this.config.id}:`, error);
    }
  }

  /**
   * Get the preferred pane index for this indicator type
   */
  getPreferredPaneIndex(): number {
    return -1; // ATR goes in a separate pane
  }

  /**
   * Get default parameters for this indicator type
   */
  protected getDefaultParameters(): IndicatorParameters {
    return {
      period: 14,
    };
  }
}
