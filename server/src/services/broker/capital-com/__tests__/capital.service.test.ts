import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { CapitalService } from "../capital.service";
import { IBrokerCredentials } from "../../interfaces/broker.interface";
import { MarketData } from "../../interfaces/types";
import WebSocket from "ws";
import axios, { AxiosResponse, AxiosInstance } from "axios";

// Mock external dependencies
jest.mock("axios");
jest.mock("ws");
jest.mock("../../../../utils/logger", () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Type the mocked axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("CapitalService", () => {
  let service: CapitalService;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  const mockCredentials: IBrokerCredentials = {
    apiKey: "test-api-key",
    apiSecret: "test-api-secret",
    isDemo: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      defaults: {},
    } as unknown as jest.Mocked<AxiosInstance>;

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    service = new CapitalService(mockCredentials);
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      const mockToken = "test-session-token";
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: mockToken },
      } as AxiosResponse);

      await service.connect(mockCredentials);

      expect(service.isConnected()).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/api/v1/session", {
        identifier: mockCredentials.apiKey,
        password: mockCredentials.apiSecret,
      });
    });

    it("should handle connection failure", async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(service.connect(mockCredentials)).rejects.toThrow("Connection failed");
      expect(service.isConnected()).toBe(false);
    });

    it("should disconnect successfully", async () => {
      // Mock successful connection first
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: "test-token" },
      } as AxiosResponse);

      await service.connect(mockCredentials);
      await service.disconnect();

      expect(service.isConnected()).toBe(false);
    });
  });

  describe("Market Data", () => {
    beforeEach(async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: "test-token" },
      } as AxiosResponse);
      await service.connect(mockCredentials);
    });

    it("should get market data", async () => {
      const mockMarketData = {
        prices: [
          {
            bid: 1.2345,
            offer: 1.2346,
            snapshotTime: "2024-03-10T12:00:00Z",
            lastTradedVolume: 1000,
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockMarketData,
      } as AxiosResponse);

      const result = await service.getMarketData("EURUSD");

      expect(result).toEqual({
        symbol: "EURUSD",
        bid: 1.2345,
        ask: 1.2346,
        timestamp: new Date("2024-03-10T12:00:00Z").getTime(),
        volume: 1000,
      });
    });

    it("should get candles", async () => {
      const mockCandles = {
        prices: [
          {
            snapshotTime: "2024-03-10T12:00:00Z",
            openPrice: 1.234,
            highPrice: 1.235,
            lowPrice: 1.233,
            closePrice: 1.2345,
            lastTradedVolume: 1000,
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockCandles,
      } as AxiosResponse);

      const result = await service.getCandles("EURUSD", "1h", 1);

      expect(result).toEqual([
        {
          timestamp: new Date("2024-03-10T12:00:00Z").getTime(),
          open: 1.234,
          high: 1.235,
          low: 1.233,
          close: 1.2345,
          volume: 1000,
        },
      ]);
    });
  });

  describe("WebSocket Functionality", () => {
    let wsEventHandlers: { [key: string]: any };
    let mockWs: any;

    beforeEach(async () => {
      wsEventHandlers = {};
      mockWs = {
        on: jest.fn((event: string, handler: any) => {
          wsEventHandlers[event] = handler;
          return mockWs;
        }),
        send: jest.fn(),
        terminate: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      jest.mocked(WebSocket).mockImplementation(() => mockWs);
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: "test-token" },
      } as AxiosResponse);

      await service.connect(mockCredentials);
    });

    it("should handle market data subscription", async () => {
      const mockCallback = jest.fn();
      await service.subscribeToMarketData("EURUSD", mockCallback);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: "subscribe",
          epic: "EURUSD",
        })
      );

      // Simulate receiving market data
      const mockData = {
        type: "PRICE_UPDATE",
        data: {
          epic: "EURUSD",
          bid: 1.2345,
          offer: 1.2346,
          volume: 1000,
        },
      };

      // Trigger message handler
      if (wsEventHandlers.message) {
        wsEventHandlers.message(JSON.stringify(mockData));
      }

      expect(mockCallback).toHaveBeenCalledWith({
        symbol: "EURUSD",
        bid: 1.2345,
        ask: 1.2346,
        timestamp: expect.any(Number),
        volume: 1000,
      });
    });

    it("should handle WebSocket reconnection", async () => {
      // Trigger close handler
      if (wsEventHandlers.close) {
        wsEventHandlers.close({});
      }

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(WebSocket).toHaveBeenCalledTimes(2); // Initial + 1 reconnect
    });
  });
});
