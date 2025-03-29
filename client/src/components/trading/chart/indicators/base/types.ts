"use client";

import { ISeriesApi, SeriesType } from "lightweight-charts";
import { ChartApiWithPanes, FormattedCandle, IndicatorConfig, IndicatorParameters, IndicatorType } from "../../../chart/core/ChartTypes";

/**
 * Series constructor type for creating series
 */
export type SeriesConstructor<T extends SeriesType> = {
  new (params?: any): ISeriesApi<T>;
} & { seriesType?: T };

/**
 * Base indicator interface
 * Defines the structure that all indicators should follow
 */
export interface BaseIndicator {
  /**
   * Initialize the indicator with necessary chart and configuration
   */
  initialize: (chart: ChartApiWithPanes, config: IndicatorConfig) => void;

  /**
   * Create the series needed for this indicator
   */
  createSeries: (paneIndex: number) => ISeriesApi<SeriesType> | null;

  /**
   * Update the indicator data
   */
  updateData: (candles: FormattedCandle[]) => void;

  /**
   * Clean up the indicator (remove series, etc.)
   */
  destroy: () => void;

  /**
   * Get the indicator configuration
   */
  getConfig: () => IndicatorConfig;

  /**
   * Set indicator parameters
   */
  setParameters: (params: IndicatorParameters) => void;

  /**
   * Set indicator visibility
   */
  setVisible: (visible: boolean) => void;

  /**
   * Get indicator type
   */
  getType: () => IndicatorType;

  /**
   * Get the preferred pane index for this indicator
   */
  getPreferredPaneIndex: () => number;

  /**
   * Get indicator id
   */
  getId: () => string;

  /**
   * Get indicator name
   */
  getName: () => string;

  /**
   * Check if indicator is visible
   */
  isVisible: () => boolean;
}

/**
 * Base indicator options interface
 */
export interface BaseIndicatorOptions {
  id: string;
  type: IndicatorType;
  name: string;
  color: string;
  parameters: IndicatorParameters;
  visible?: boolean;
}

/**
 * Series creation options
 */
export interface SeriesCreationOptions {
  color: string;
  lineWidth?: number;
  priceScaleId?: string;
  title: string;
  lastValueVisible?: boolean;
  priceFormat?: {
    type: string;
    precision: number;
    minMove: number;
  };
  autoscaleInfoProvider?: () => {
    priceRange: {
      minValue: number;
      maxValue: number;
    };
    margins: {
      above: number;
      below: number;
    };
  };
}
