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
    priceScaleId?: string;
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
    this.priceScaleId = `atr-${options.id}-scale`;
  }

  /**
   * Create the ATR series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) return null;

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 14;

      // Use price scale ID from parameters if provided, otherwise use the default
      if (this.config.parameters.priceScaleId) {
        this.priceScaleId = this.config.parameters.priceScaleId as string;
      }

      // Log creation
      console.log(`[ATR] Creating ATR series for ${this.config.id} in pane ${paneIndex} with price scale ID: ${this.priceScaleId}`);

      // Determine the pane type for proper configuration
      const isInVolumPane = paneIndex === 1;

      // Create the ATR line series
      this.lineSeries = this.chart.addSeries(
        LineSeries,
        {
          color: this.config.color,
          // We use `any` here because the types in lightweight-charts are inconsistent
          // between different versions. In v3, lineWidth is a number, but in v4+ it's an object.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 2 as any,
          lastValueVisible: true,
          priceFormat: {
            type: "price",
            precision: 6,
            minMove: 0.000001,
          },
          title: `ATR (${period})`,
          priceScaleId: this.priceScaleId,
          // Don't use overlay - it's not available in the type
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Configure the price scale specifically for ATR
      if (this.lineSeries && typeof this.lineSeries.priceScale === "function") {
        const priceScale = this.lineSeries.priceScale();

        if (isInVolumPane) {
          // For volume pane, position ATR above volume bars
          priceScale.applyOptions({
            scaleMargins: {
              top: 0.05, // Very small margin at top
              bottom: 0.5, // Leave bottom half for volume
            },
            visible: true,
            autoScale: true,
            mode: 0,
          });
        } else {
          // For other panes, use default settings
          priceScale.applyOptions({
            autoScale: true,
            mode: 0,
            scaleMargins: {
              top: 0.1,
              bottom: 0.1,
            },
          });
        }
      }

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
    // If a pane index is specified in the configuration, use it
    if (typeof this.config.parameters.paneIndex === "number") {
      return this.config.parameters.paneIndex as number;
    }

    // CRITICAL FIX: ATR needs its own pane like RSI
    return -1;
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
