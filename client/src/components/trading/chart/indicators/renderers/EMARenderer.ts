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
  private priceScaleId: string;

  /**
   * Create a new EMA renderer
   */
  constructor(options: EMARendererOptions) {
    super({
      ...options,
      name: options.name || `EMA (${options.parameters.period || 20})`,
      type: "EMA",
    });
    this.priceScaleId = `ema-${options.id}-scale`;
    console.log(`[EMA] Creating EMARenderer with options:`, {
      id: options.id,
      name: options.name || `EMA (${options.parameters.period || 20})`,
      type: "EMA",
      parameters: options.parameters,
    });
  }

  /**
   * Create the EMA series
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) {
      console.error(`[EMA] Cannot create series without chart instance for ${this.config.id}`);
      return null;
    }

    try {
      // Get parameters
      const period = (this.config.parameters.period as number) || 20;

      // Log creation
      console.log(`[EMA] Creating EMA series for ${this.config.id} in pane ${paneIndex}`);

      // Create the EMA line series
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
          title: `EMA (${period})`,
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

        // Store reference for later
        this.mainSeries = this.lineSeries;

        // Update config to store series reference
        this.config.series = this.lineSeries;
        this.config.paneIndex = paneIndex;
        this.config.parameters.paneIndex = paneIndex;

        console.log(`[EMA] Successfully created EMA series for ${this.config.id}`);
      } else {
        console.error(`[EMA] Failed to create line series for ${this.config.id}`);
      }

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
      console.log(`[EMA] Cannot update data - series: ${!!this.lineSeries}, candles: ${candles.length}`);
      return;
    }

    try {
      // Extract parameters with defaults
      const period = (this.config.parameters.period as number) || 20;

      // Calculate EMA data
      const emaData = calculateEMA(candles, period);
      console.log(`[EMA] Calculated EMA data for ${this.config.id}, points: ${emaData.length}`);

      // Set the data for the line series
      this.lineSeries.setData(emaData);

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

      console.log(`[EMA] Successfully updated EMA data for ${this.config.id}`);
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
