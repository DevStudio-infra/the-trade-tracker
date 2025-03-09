export interface TradingPair {
  symbol: string;
  base: string;
  quote: string;
  displayName: string;
  minQuantity: number;
  maxQuantity: number;
  priceDecimals: number;
  quantityDecimals: number;
}

export interface Broker {
  id: string;
  name: string;
  pairs: TradingPair[];
}

export const brokers: Broker[] = [
  {
    id: "binance",
    name: "Binance",
    pairs: [
      {
        symbol: "BTCUSDT",
        base: "BTC",
        quote: "USDT",
        displayName: "BTC/USDT",
        minQuantity: 0.00001,
        maxQuantity: 1000,
        priceDecimals: 2,
        quantityDecimals: 5,
      },
      {
        symbol: "ETHUSDT",
        base: "ETH",
        quote: "USDT",
        displayName: "ETH/USDT",
        minQuantity: 0.0001,
        maxQuantity: 10000,
        priceDecimals: 2,
        quantityDecimals: 4,
      },
      // Add more pairs as needed
    ],
  },
  {
    id: "forex",
    name: "Forex Broker",
    pairs: [
      {
        symbol: "EURUSD",
        base: "EUR",
        quote: "USD",
        displayName: "EUR/USD",
        minQuantity: 0.01,
        maxQuantity: 100000000,
        priceDecimals: 5,
        quantityDecimals: 2,
      },
      {
        symbol: "GBPUSD",
        base: "GBP",
        quote: "USD",
        displayName: "GBP/USD",
        minQuantity: 0.01,
        maxQuantity: 100000000,
        priceDecimals: 5,
        quantityDecimals: 2,
      },
      // Add more pairs as needed
    ],
  },
];
