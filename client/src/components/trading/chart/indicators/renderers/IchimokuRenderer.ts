"use client";

import { LineSeries, ISeriesApi, SeriesType } from "lightweight-charts";
import { IndicatorBase } from "../base/IndicatorBase";
import { BaseIndicatorOptions } from "../base/types";
import { FormattedCandle } from "../../core/ChartTypes";
import { calculateIchimoku } from "../calculations/ichimoku";

/**
 * Ichimoku Cloud renderer options
 */
export interface IchimokuRendererOptions extends BaseIndicatorOptions {
  // Specialized parameters for Ichimoku Cloud
  conversionPeriod?: number; // Tenkan-sen (Conversion Line) period
  basePeriod?: number; // Kijun-sen (Base Line) period
  spanPeriod?: number; // Senkou Span B period
  displacement?: number; // Displacement period for cloud
  conversionLineColor?: string; // Tenkan-sen color
  baseLineColor?: string; // Kijun-sen color
  spanAColor?: string; // Senkou Span A color
  spanBColor?: string; // Senkou Span B color
  chikouColor?: string; // Chikou Span color
}

/**
 * Ichimoku Cloud renderer class
 * Manages rendering of Ichimoku Cloud indicator components
 */
export class IchimokuRenderer extends IndicatorBase {
  // Store additional series references
  private conversionLineSeries: ISeriesApi<"Line"> | null = null;
  private baseLineSeries: ISeriesApi<"Line"> | null = null;
  private spanASeries: ISeriesApi<"Line"> | null = null;
  private spanBSeries: ISeriesApi<"Line"> | null = null;
  private chikouSeries: ISeriesApi<"Line"> | null = null;
  private priceScaleId: string; // Add priceScaleId for sharing between all components

  // Default parameters
  private conversionPeriod: number;
  private basePeriod: number;
  private spanPeriod: number;
  private displacement: number;
  private conversionLineColor: string;
  private baseLineColor: string;
  private spanAColor: string;
  private spanBColor: string;
  private chikouColor: string;

  constructor(options: IchimokuRendererOptions) {
    super(options);

    // Initialize parameters with defaults or provided values
    this.conversionPeriod = options.conversionPeriod || 9;
    this.basePeriod = options.basePeriod || 26;
    this.spanPeriod = options.spanPeriod || 52;
    this.displacement = options.displacement || 26;

    // Set default colors if not provided
    this.conversionLineColor = options.conversionLineColor || "#2962FF"; // Blue
    this.baseLineColor = options.baseLineColor || "#FF6D00"; // Orange
    this.spanAColor = options.spanAColor || "#26A69A"; // Green
    this.spanBColor = options.spanBColor || "#EF5350"; // Red
    this.chikouColor = options.chikouColor || "#9C27B0"; // Purple

    // Create a unique price scale ID for this instance
    this.priceScaleId = `ichimoku-${options.id}-scale`;
  }

  /**
   * Create all series needed for the Ichimoku Cloud indicator
   * @param paneIndex - Index of the pane to create the series in
   * @returns The main series (Conversion Line)
   */
  createSeries(paneIndex: number): ISeriesApi<SeriesType> | null {
    if (!this.chart) {
      console.error("[ICHIMOKU] Chart instance not available");
      return null;
    }

    try {
      console.log(`[ICHIMOKU] Creating Ichimoku series in pane ${paneIndex}`);

      // Use price scale ID from parameters if provided, otherwise use the one from constructor
      if (this.config.parameters.priceScaleId) {
        this.priceScaleId = this.config.parameters.priceScaleId as string;
      }

      console.log(`[ICHIMOKU] Using price scale ID: ${this.priceScaleId}`);

      // For main pane, share the right price scale
      const sharedScaleId = paneIndex === 0 ? "right" : this.priceScaleId;

      // Common options for all series
      const commonSeriesOptions = {
        priceFormat: {
          type: "price" as const,
          precision: 2,
          minMove: 0.01,
        },
        priceScaleId: sharedScaleId,
      };

      // Create Tenkan-sen (Conversion Line)
      this.conversionLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: this.conversionLineColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 2 as any,
          title: `Tenkan-sen (${this.conversionPeriod})`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create Kijun-sen (Base Line)
      this.baseLineSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: this.baseLineColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 2 as any,
          title: `Kijun-sen (${this.basePeriod})`,
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create Senkou Span A (Leading Span A)
      this.spanASeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: this.spanAColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 1 as any,
          lineStyle: 2, // Dashed
          title: "Senkou Span A",
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create Senkou Span B (Leading Span B)
      this.spanBSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: this.spanBColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 1 as any,
          lineStyle: 2, // Dashed
          title: "Senkou Span B",
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Create Chikou Span (Lagging Span)
      this.chikouSeries = this.chart.addSeries(
        LineSeries,
        {
          ...commonSeriesOptions,
          color: this.chikouColor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lineWidth: 1 as any,
          title: "Chikou Span",
        },
        paneIndex
      ) as ISeriesApi<"Line">;

      // Store all series references in additionalSeries for easy access
      this.additionalSeries = {
        baseLineSeries: this.baseLineSeries,
        spanASeries: this.spanASeries,
        spanBSeries: this.spanBSeries,
        chikouSeries: this.chikouSeries,
      };

      // Store reference for later
      this.mainSeries = this.conversionLineSeries;

      // Update config to store reference
      this.config.series = this.conversionLineSeries || undefined;
      this.config.paneIndex = paneIndex;
      this.config.parameters.paneIndex = paneIndex;

      console.log(`[ICHIMOKU] Successfully created Ichimoku series`);

      // Main series is the Conversion Line (Tenkan-sen)
      return this.conversionLineSeries;
    } catch (error) {
      console.error("[ICHIMOKU] Error creating Ichimoku series:", error);
      return null;
    }
  }

  /**
   * Update Ichimoku Cloud data based on candles
   * @param candles - Array of formatted candles
   */
  updateData(candles: FormattedCandle[]) {
    if (!this.conversionLineSeries || !this.baseLineSeries || !this.spanASeries || !this.spanBSeries || !this.chikouSeries) {
      console.error("Ichimoku series not created");
      return;
    }

    try {
      // Calculate Ichimoku data
      const ichimokuData = calculateIchimoku(candles, this.conversionPeriod, this.basePeriod, this.spanPeriod, this.displacement);

      if (ichimokuData.length === 0) {
        console.warn("Not enough data to calculate Ichimoku");
        return;
      }

      // Prepare data for each series
      const conversionLineData = ichimokuData.map((point) => ({
        time: point.time,
        value: point.tenkan,
      }));

      const baseLineData = ichimokuData.map((point) => ({
        time: point.time,
        value: point.kijun,
      }));

      // Prepare delayed data for Senkou Spans (shifted forward by displacement)
      const delayedData = ichimokuData
        .map((point, index) => {
          // Create future time for cloud
          const futureIndex = index + this.displacement;
          const futureTime = futureIndex < candles.length ? candles[futureIndex].time : undefined;

          if (futureTime === undefined) return null;

          return {
            time: futureTime,
            senkou_a: point.senkou_a,
            senkou_b: point.senkou_b,
          };
        })
        .filter((point): point is { time: (typeof candles)[0]["time"]; senkou_a: number; senkou_b: number } => point !== null);

      const spanAData = delayedData.map((point) => ({
        time: point.time,
        value: point.senkou_a,
      }));

      const spanBData = delayedData.map((point) => ({
        time: point.time,
        value: point.senkou_b,
      }));

      // Prepare delayed data for Chikou Span (shifted backward by displacement)
      const chikouData = ichimokuData
        .map((point, index) => {
          // Calculate past index
          const pastIndex = index - this.displacement;
          const pastTime = pastIndex >= 0 && pastIndex < candles.length ? candles[pastIndex].time : undefined;

          if (pastTime === undefined) return null;

          return {
            time: pastTime,
            value: point.chikou,
          };
        })
        .filter((point): point is { time: (typeof candles)[0]["time"]; value: number } => point !== null);

      // Set data for each series
      this.conversionLineSeries.setData(conversionLineData);
      this.baseLineSeries.setData(baseLineData);
      this.spanASeries.setData(spanAData);
      this.spanBSeries.setData(spanBData);
      this.chikouSeries.setData(chikouData);

      // Apply individual scale margins for better visualization
      if (this.chart) {
        this.conversionLineSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          autoScale: true,
        });
      }
    } catch (error) {
      console.error("Error updating Ichimoku data:", error);
    }
  }

  /**
   * Cleanup by removing all series
   */
  destroy() {
    if (this.chart) {
      if (this.conversionLineSeries) {
        this.chart.removeSeries(this.conversionLineSeries);
        this.conversionLineSeries = null;
      }
      if (this.baseLineSeries) {
        this.chart.removeSeries(this.baseLineSeries);
        this.baseLineSeries = null;
      }
      if (this.spanASeries) {
        this.chart.removeSeries(this.spanASeries);
        this.spanASeries = null;
      }
      if (this.spanBSeries) {
        this.chart.removeSeries(this.spanBSeries);
        this.spanBSeries = null;
      }
      if (this.chikouSeries) {
        this.chart.removeSeries(this.chikouSeries);
        this.chikouSeries = null;
      }
    }
  }

  /**
   * Ichimoku Cloud is displayed in the main price chart pane
   */
  getPreferredPaneIndex(): number {
    return 0; // Main price chart pane
  }

  /**
   * Get default parameters for the indicator
   */
  getDefaultParameters() {
    return {
      conversionPeriod: this.conversionPeriod,
      basePeriod: this.basePeriod,
      spanPeriod: this.spanPeriod,
      displacement: this.displacement,
      conversionLineColor: this.conversionLineColor,
      baseLineColor: this.baseLineColor,
      spanAColor: this.spanAColor,
      spanBColor: this.spanBColor,
      chikouColor: this.chikouColor,
    };
  }
}
