import { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";
import { CandleData } from "../../../types";
import { IndicatorBase } from "../base/IndicatorBase";
import { IndicatorConfig } from "../types";
import { indicatorDefaults } from "../defaults";
import { SMAIndicator } from "../implementations/SMAIndicator";
import { EMAIndicator } from "../implementations/EMAIndicator";
import { VWAPIndicator } from "../implementations/VWAPIndicator";
import { RSIIndicator } from "../implementations/RSIIndicator";
import { MACDIndicator } from "../implementations/MACDIndicator";
import { BollingerBandsIndicator } from "../implementations/BollingerBandsIndicator";
import { VolumeIndicator } from "../implementations/VolumeIndicator";
import { VolumeProfileIndicator } from "../implementations/VolumeProfileIndicator";

/**
 * Get the preferred pane index for an indicator
 * @param type Indicator type
 * @param chart Chart instance
 * @returns {number} The preferred pane index
 */
export function getPreferredPaneIndex(type: string): number {
  // Check if we can identify the indicator type
  const indicatorInfo = indicatorDefaults[type as keyof typeof indicatorDefaults];

  // If we can determine that it's an oscillator type indicator,
  // it should be in a separate pane (not 0)
  if (indicatorInfo?.isOscillator === true) {
    // Return a higher index to signal it's an oscillator and needs a dedicated pane
    // The actual pane number will be assigned by the ChartInstance based on availability
    return -1; // Special value indicating "needs own pane"
  }

  // If we can determine that it's explicitly a main pane indicator, return 0
  if (indicatorInfo?.isOscillator === false) {
    return 0; // Main pane
  }

  // For volume-related indicators
  if (type.toLowerCase().includes("volume")) {
    return 1; // Default volume pane
  }

  // Default behavior - if we're not sure, assume it goes in the main pane
  console.log(`No pane preference found for indicator: ${type}, assuming main pane`);
  return 0;
}

/**
 * Create an indicator instance of the appropriate type
 */
export function createIndicator(
  config: IndicatorConfig,
  chart: IChartApi | null,
  mainSeries: ISeriesApi<SeriesType> | null,
  data: CandleData[] | null,
  paneIndex?: number
): IndicatorBase | null {
  try {
    const preferredIndex = paneIndex !== undefined ? paneIndex : getPreferredPaneIndex(config.type);

    console.log(`Creating indicator ${config.type} with ID ${config.id} and preferred pane index ${preferredIndex}`);

    // For debugging
    if (preferredIndex === -1) {
      console.log(`Indicator ${config.type} is an oscillator and needs its own pane`);
    }

    // Logic for creating appropriate indicator based on type
    // Note: paneIndex is a suggestion, but will be handled by the chart instance
    // when creating separate panes for oscillators
    switch (config.type) {
      case "SMA":
        return new SMAIndicator(chart, mainSeries, config, data, preferredIndex);
      case "EMA":
        return new EMAIndicator(chart, mainSeries, config, data, preferredIndex);
      case "VWAP":
        return new VWAPIndicator(chart, mainSeries, config, data, preferredIndex);
      case "RSI":
        return new RSIIndicator(chart, mainSeries, config, data, preferredIndex);
      case "MACD":
        return new MACDIndicator(chart, mainSeries, config, data, preferredIndex);
      case "BB":
        return new BollingerBandsIndicator(chart, mainSeries, config, data, preferredIndex);
      case "Volume":
        return new VolumeIndicator(chart, mainSeries, config, data, preferredIndex);
      case "VolumeProfile":
        return new VolumeProfileIndicator(chart, mainSeries, config, data, preferredIndex);
      default:
        console.error(`Unknown indicator type: ${config.type}`);
        return null;
    }
  } catch (error) {
    console.error(`Error creating indicator ${config.type}:`, error);
    return null;
  }
}
