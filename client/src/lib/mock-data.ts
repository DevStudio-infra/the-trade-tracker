export const mockStats = {
  totalRevenue: {
    value: 45231.89,
    change: 20.1,
    timeframe: "last month",
  },
  activeTrades: {
    value: 12234,
    change: 19,
    timeframe: "last month",
  },
  winRate: {
    value: 67.5,
    change: 5.2,
    timeframe: "last month",
  },
  aiCredits: {
    value: 573,
    change: 201,
    timeframe: "last hour",
  },
};

export const mockTrades = [
  {
    id: "1",
    pair: "EUR/USD",
    side: "buy" as const,
    size: 100000,
    entry_price: 1.082,
    current_price: 1.0842,
    pnl: 220,
    pnl_percent: 0.2,
    closed: false,
    created_at: "2024-03-15T10:30:00Z",
    strategy_used: "Trend Following",
    confidence_score: 0.85,
  },
  {
    id: "2",
    pair: "GBP/USD",
    side: "sell" as const,
    size: 75000,
    entry_price: 1.265,
    current_price: 1.2634,
    pnl: 120,
    pnl_percent: 0.16,
    closed: false,
    created_at: "2024-03-15T11:15:00Z",
    strategy_used: "Mean Reversion",
    confidence_score: 0.78,
  },
  {
    id: "3",
    pair: "USD/JPY",
    side: "buy" as const,
    size: 50000,
    entry_price: 151.2,
    current_price: 151.42,
    pnl: -85,
    pnl_percent: -0.17,
    closed: false,
    created_at: "2024-03-15T12:00:00Z",
    strategy_used: "Breakout",
    confidence_score: 0.92,
  },
];

export const mockSignals = [
  {
    id: "signal_1",
    pair: "BTC/USDT",
    signal_type: "BUY",
    confidence: 87,
    strategy: "Triple Bottom",
    stop_loss: 47500.0,
    take_profit: 49800.0,
    created_at: "2024-02-09T15:00:00Z",
    chart_image_url: "/mock/btc-chart.png",
  },
  {
    id: "signal_2",
    pair: "ETH/USDT",
    signal_type: "SELL",
    confidence: 82,
    strategy: "Double Top",
    stop_loss: 2550.0,
    take_profit: 2380.0,
    created_at: "2024-02-09T14:45:00Z",
    chart_image_url: "/mock/eth-chart.png",
  },
  {
    id: "signal_3",
    pair: "EUR/USD",
    signal_type: "BUY",
    confidence: 75,
    strategy: "Trend Following",
    stop_loss: 1.075,
    take_profit: 1.085,
    created_at: "2024-02-09T14:30:00Z",
    chart_image_url: "/mock/eurusd-chart.png",
  },
];

export const mockPerformanceData = {
  total_trades: 1458,
  win_rate: 67.5,
  profit_loss: 12500.75,
  profit_loss_percentage: 25.8,
  average_risk_reward: 2.3,
  largest_win: 2850.0,
  largest_loss: -1200.0,
  sharpe_ratio: 1.8,
  chart_data: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    equity_curve: [10000, 11200, 10800, 12400, 13800, 15200, 14800, 16400, 18200, 17800, 19400, 21000],
    win_loss: [1, 1, -1, 1, 1, 1, -1, 1, 1, -1, 1, 1],
  },
};

export const mockUserProfile = {
  id: "user_1",
  email: "trader@example.com",
  username: "ProTrader",
  subscription_plan: "pro" as const,
  credits: 1000,
  onboarding_completed: true,
  broker_connected: true,
  created_at: "2023-08-15T00:00:00Z",
};

export const mockChartData = {
  timeframe: "1h",
  candles: [
    { time: 1710489600, open: 1.082, high: 1.0845, low: 1.0815, close: 1.0842 },
    { time: 1710493200, open: 1.0842, high: 1.0855, low: 1.0835, close: 1.085 },
    { time: 1710496800, open: 1.085, high: 1.0865, low: 1.0845, close: 1.086 },
    { time: 1710500400, open: 1.086, high: 1.087, low: 1.0855, close: 1.0865 },
    { time: 1710504000, open: 1.0865, high: 1.0875, low: 1.086, close: 1.087 },
  ],
};
