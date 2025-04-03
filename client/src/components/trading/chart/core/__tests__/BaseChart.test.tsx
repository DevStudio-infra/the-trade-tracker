import { render, screen, act } from "@testing-library/react";
import { BaseChart } from "../BaseChart";
import { createChart } from "lightweight-charts";

// Mock lightweight-charts
jest.mock("lightweight-charts", () => ({
  createChart: jest.fn(() => ({
    remove: jest.fn(),
    applyOptions: jest.fn(),
    timeScale: jest.fn(() => ({
      fitContent: jest.fn(),
    })),
  })),
}));

// Mock ResizeObserver
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

describe("BaseChart", () => {
  const mockCandles = [
    {
      timestamp: 1625097600000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<BaseChart candles={null} isDarkMode={false} />);
    expect(screen.getByRole("region")).toBeInTheDocument();
  });

  it("creates chart instance with correct options", () => {
    render(<BaseChart candles={null} isDarkMode={true} />);
    expect(createChart).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        layout: expect.objectContaining({
          background: expect.any(Object),
        }),
      })
    );
  });

  it("calls onChartCreated when chart is initialized", () => {
    const onChartCreated = jest.fn();
    render(<BaseChart candles={null} isDarkMode={false} onChartCreated={onChartCreated} />);
    expect(onChartCreated).toHaveBeenCalledWith(expect.any(Object));
  });

  it("calls onSeriesCreated when series are initialized", () => {
    const onSeriesCreated = jest.fn();
    render(<BaseChart candles={null} isDarkMode={false} onSeriesCreated={onSeriesCreated} />);
    expect(onSeriesCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        candlestickSeries: expect.any(Object),
        volumeSeries: expect.any(Object),
      })
    );
  });

  it("updates chart data when candles prop changes", () => {
    const { rerender } = render(<BaseChart candles={null} isDarkMode={false} />);

    // Update with new candles
    rerender(<BaseChart candles={mockCandles} isDarkMode={false} />);

    // TODO: Add assertions for data updates once we mock the series methods
  });

  it("cleans up chart instance on unmount", () => {
    const { unmount } = render(<BaseChart candles={null} isDarkMode={false} />);
    unmount();
    // TODO: Add assertions for cleanup once we have proper mocks
  });

  it("handles resize events", async () => {
    render(<BaseChart candles={mockCandles} isDarkMode={false} />);

    // Simulate resize
    act(() => {
      const resizeCallback = mockResizeObserver.mock.calls[0][0];
      resizeCallback([{ contentRect: { width: 800 } }]);
    });

    // TODO: Add assertions for resize handling once we have proper mocks
  });
});
