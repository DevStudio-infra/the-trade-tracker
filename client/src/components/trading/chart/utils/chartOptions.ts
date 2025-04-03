import { ChartOptions, ColorType } from "lightweight-charts";
import { chartColors } from "./chartColors";

export const getChartOptions = (isDarkMode: boolean): ChartOptions => {
  const colors = isDarkMode ? chartColors.dark : chartColors.light;

  return {
    width: 0,
    height: 0,
    autoSize: true,
    kineticScroll: {
      mouse: true,
      touch: true,
    },
    trackingMode: {
      exitMode: 1,
    },
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.text,
      fontSize: 12,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      panes: {
        enableResize: true,
        separatorColor: colors.borderColor,
        separatorHoverColor: colors.text,
      },
      attributionLogo: false,
      colorSpace: "srgb",
      colorParsers: [],
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
      borderColor: colors.borderColor,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 20,
      barSpacing: 8,
      minBarSpacing: 0.5,
      maxBarSpacing: 40,
      fixLeftEdge: false,
      fixRightEdge: false,
      lockVisibleTimeRangeOnResize: false,
      rightBarStaysOnScroll: false,
      borderVisible: true,
      visible: true,
      tickMarkFormatter: undefined,
      shiftVisibleRangeOnNewBar: true,
      allowShiftVisibleRangeOnWhitespaceReplacement: true,
      ticksVisible: true,
      uniformDistribution: false,
      minimumHeight: 0,
      allowBoldLabels: true,
      ignoreWhitespaceIndices: false,
    },
    rightPriceScale: {
      borderColor: colors.borderColor,
      autoScale: true,
      mode: 0,
      invertScale: false,
      alignLabels: true,
      borderVisible: true,
      entireTextOnly: false,
      visible: true,
      ticksVisible: true,
      minimumWidth: 0,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true,
    },
    handleScale: {
      axisPressedMouseMove: {
        time: true,
        price: true,
      },
      axisDoubleClickReset: true,
      mouseWheel: true,
      pinch: true,
    },
    localization: {
      locale: "en-US",
      dateFormat: "yyyy-MM-dd",
    },
    overlayPriceScales: {
      mode: 0,
      invertScale: false,
      alignLabels: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
      borderVisible: true,
      entireTextOnly: false,
      ticksVisible: true,
      minimumWidth: 0,
      borderColor: colors.borderColor,
    },
    leftPriceScale: {
      mode: 0,
      autoScale: true,
      invertScale: false,
      alignLabels: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
      borderColor: colors.borderColor,
      borderVisible: false,
      entireTextOnly: false,
      visible: false,
      ticksVisible: true,
      minimumWidth: 0,
    },
  };
};

export const getCandlestickSeriesOptions = (isDarkMode: boolean) => {
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
};

export const getVolumeSeriesOptions = (isDarkMode: boolean) => {
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
};
