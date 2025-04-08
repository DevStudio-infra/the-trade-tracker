import { ColorType, ChartOptions, SeriesOptionsMap } from "lightweight-charts";

// Shared color schemes matching client implementation
export const chartColors = {
  light: {
    background: "#FFFFFF",
    text: "#333333",
    gridLines: "#EAEAEA",
    borderColor: "#DDDDDD",
    upColor: "#26A69A",
    downColor: "#EF5350",
    wickUpColor: "#26A69A",
    wickDownColor: "#EF5350",
    volumeUp: "rgba(38, 166, 154, 0.5)",
    volumeDown: "rgba(239, 83, 80, 0.5)",
    crosshairColor: "#999999",
  },
  dark: {
    background: "#1E222D",
    text: "#DDD",
    gridLines: "#2B2B43",
    borderColor: "#2B2B43",
    upColor: "#4CAF50",
    downColor: "#FF5252",
    wickUpColor: "#4CAF50",
    wickDownColor: "#FF5252",
    volumeUp: "rgba(76, 175, 80, 0.5)",
    volumeDown: "rgba(255, 82, 82, 0.5)",
    crosshairColor: "#999999",
  },
};

// Chart configuration matching client settings
export function getChartOptions(isDarkMode: boolean, width: number = 1200, height: number = 800): ChartOptions {
  const colors = isDarkMode ? chartColors.dark : chartColors.light;

  return {
    width,
    height,
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.text,
      fontSize: 12,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      attributionLogo: false,
    },
    handleScroll: true,
    handleScale: true,
    kineticScroll: {
      mouse: true,
      touch: true,
    },
    trackingMode: {
      exitMode: 1,
    },
    grid: {
      vertLines: {
        color: colors.gridLines,
        style: 1,
        visible: true,
      },
      horzLines: {
        color: colors.gridLines,
        style: 1,
        visible: true,
      },
    },
    crosshair: {
      vertLine: {
        color: colors.crosshairColor,
        width: 1,
        style: 3,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: colors.background,
      },
      horzLine: {
        color: colors.crosshairColor,
        width: 1,
        style: 3,
        visible: true,
        labelVisible: true,
        labelBackgroundColor: colors.background,
      },
      mode: 1,
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 10,
      barSpacing: 8,
      minBarSpacing: 0.5,
      fixLeftEdge: true,
      fixRightEdge: true,
      borderColor: colors.borderColor,
      borderVisible: true,
      visible: true,
      lockVisibleTimeRangeOnResize: false,
      rightBarStaysOnScroll: true,
      allowShiftVisibleRangeOnWhitespaceReplacement: true,
      tickMarkFormatter: undefined,
      ticksVisible: true,
      uniformDistribution: false,
      shiftVisibleRangeOnNewBar: true,
      minimumHeight: 0,
      allowBoldLabels: true,
    },
    rightPriceScale: {
      borderColor: colors.borderColor,
      entireTextOnly: true,
      mode: 0,
      autoScale: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
      borderVisible: true,
      visible: true,
      invertScale: false,
      alignLabels: true,
      ticksVisible: true,
      minimumWidth: 0,
    },
    localization: {
      locale: "en-US",
      dateFormat: "yyyy-MM-dd",
    },
    autoSize: true,
    watermark: {
      visible: false,
      color: "rgba(0, 0, 0, 0)",
      text: "",
      fontSize: 12,
      fontFamily: "sans-serif",
      fontStyle: "",
      horzAlign: "center",
      vertAlign: "center",
    },
    leftPriceScale: {
      visible: false,
      autoScale: true,
      mode: 0,
      invertScale: false,
      alignLabels: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
      borderVisible: true,
      borderColor: colors.borderColor,
      entireTextOnly: true,
      ticksVisible: true,
      minimumWidth: 0,
    },
    overlayPriceScales: {
      borderVisible: true,
      mode: 0,
      invertScale: false,
      alignLabels: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.2,
      },
      entireTextOnly: true,
      ticksVisible: true,
      minimumWidth: 0,
      borderColor: colors.borderColor,
    },
  };
}

// Series options matching client settings
export function getCandlestickSeriesOptions(isDarkMode: boolean) {
  const colors = isDarkMode ? chartColors.dark : chartColors.light;

  return {
    upColor: colors.upColor,
    downColor: colors.downColor,
    wickUpColor: colors.wickUpColor,
    wickDownColor: colors.wickDownColor,
    borderVisible: false,
    priceFormat: {
      type: "price",
      precision: 5,
      minMove: 0.00001,
    },
  };
}

export function getVolumeSeriesOptions(isDarkMode: boolean) {
  const colors = isDarkMode ? chartColors.dark : chartColors.light;

  return {
    color: colors.volumeUp,
    priceFormat: {
      type: "volume",
    },
    priceScaleId: "", // Set to empty string for overlay
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  };
}

// Indicator options matching client settings
export function getIndicatorSeriesOptions(isDarkMode: boolean, type: string) {
  const colors = isDarkMode ? chartColors.dark : chartColors.light;

  const baseOptions = {
    lineWidth: 2,
    priceFormat: {
      type: "price",
      precision: 5,
      minMove: 0.00001,
    },
  };

  switch (type) {
    case "EMA":
    case "SMA":
      return {
        ...baseOptions,
        color: "#2962FF",
      };
    case "RSI":
      return {
        ...baseOptions,
        color: "#E91E63",
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
        baseLineVisible: true,
        baseLineColor: colors.gridLines,
        baseLineWidth: 1,
        baseLineStyle: 1,
        overlay: false,
      };
    default:
      return baseOptions;
  }
}
