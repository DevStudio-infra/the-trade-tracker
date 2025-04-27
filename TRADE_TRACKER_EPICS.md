# Trade Tracker App – MVP EPICS & User Stories

This document outlines the major EPICS (high-level features) and key user stories for the MVP of the Trade Tracker application.

## 1. User Authentication & Profile
- User registration, login, and logout
- Google authentication as a login option
- Basic profile management

**User Stories:**
- As a user, I want to register for an account so that I can access the app.
- As a user, I want to log in and log out securely.
- As a user, I want to log in using my Google account.
- As a user, I want to update my profile information.

## 2. Broker Credential Management
- Securely store and manage broker credentials (initially only Capital.com, but extensible for more brokers)
- Use Supabase as the backend database

**User Stories:**
- As a user, I want to add my Capital.com credentials so I can connect my broker account.
- As a user, I want to add credentials for other brokers in the future.
- As a user, I want to update or remove my broker credentials.
- As a user, I want my credentials to be stored securely.

## 3. Strategy Management
- Create custom trading strategies
- Choose from a set of default strategies
- When creating a bot instance, allow user to add a custom prompt

**User Stories:**
- As a user, I want to create my own trading strategies.
- As a user, I want to select a default strategy provided by the app.
- As a user, I want to edit or delete my custom strategies.
- As a user, I want to add a custom prompt to be used by the LLM when creating a bot instance.

## 4. Chart Visualization & Indicators
- Visualize price and trade data using lightweight-charts
- Add and customize technical indicators
- When a strategy is selected, the chart automatically renders all indicators related to the strategy

**User Stories:**
- As a user, I want to view price charts for my selected instruments.
- As a user, I want to add indicators to my charts.
- As a user, I want to customize chart settings and indicators.
- As a user, when I select a strategy, I want the chart to display all relevant indicators for that strategy.

## 5. Automated Trading Bot (LLM-Powered)
- Users can create and persist bot instances in the database
- Each bot instance is tied to a specific timeframe, trading pair, and broker credential
- Bots leverage LLM to interpret strategies and manage trades
- Users can activate, deactivate, and manage their bots
- Bots run persistently on the server
- For each evaluation, the server renders the chart with the strategy, takes a screenshot, and sends the screenshot, strategy description, and custom prompt to the LLM
- LLM evaluates trades and strategies

**User Stories:**
- As a user, I want to create a new trading bot based on my chosen strategy, timeframe, pair, and broker credential.
- As a user, I want to view all my bot instances and their statuses.
- As a user, I want to activate or deactivate my bots.
- As a user, I want the bot to automatically open, close, and manage trades for me.
- As a user, I want the bot to log its evaluations and actions.
- As a user, I want the bot to run continuously on the server.
- As a user, I want the bot to send the chart screenshot, strategy description, and my custom prompt to the LLM for trade evaluation.

## 6. Trade & Evaluation Tracking
- Persist all trades executed by the bot and user
- Track LLM evaluations and decisions
- View trade history and related analytics

**User Stories:**
- As a user, I want to see a history of all trades made by me and my bots.
- As a user, I want to view the LLM's evaluations and reasoning for each trade.
- As a user, I want to filter and analyze my trade history.

## 7. Notifications
- Notify users of trade events (open, close, manage)
- In-app and/or email notifications

**User Stories:**
- As a user, I want to receive notifications when a trade is opened, closed, or managed by a bot.
- As a user, I want to choose how I receive notifications (in-app, email, etc.).

## 8. General Settings
- User-configurable settings and preferences

**User Stories:**
- As a user, I want to configure my app preferences.
- As a user, I want to manage notification settings and other options.

---

These EPICS and user stories represent the MVP scope. Additional features and enhancements will be considered after the MVP release.

---

## Appendix: Capital.com API Overview

The Capital.com API is a RESTful interface that allows users to interact programmatically with their trading account. It supports authentication, retrieving account and market data, placing and managing trades, and more.

### 1. Authentication
Capital.com uses a session-based authentication. You first send your credentials to obtain a session token, which is then used in subsequent requests.

**Sample: Login and get session token**
```http
POST https://api-capital.backend-capital.com/api/v1/session
Content-Type: application/json

{
  "identifier": "your_email@example.com",
  "password": "your_password"
}
```
**Response:**
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
Include this token in the `X-SECURITY-TOKEN` header for all future requests.

### 2. Get Account Information
```http
GET https://api-capital.backend-capital.com/api/v1/accounts/me
X-SECURITY-TOKEN: {sessionToken}
```
**Response:**
```json
{
  "accountId": "123456",
  "balance": 10000.00,
  "currency": "USD",
  ...
}
```

### 3. Get Market Data
```http
GET https://api-capital.backend-capital.com/api/v1/prices/markets/{marketId}
X-SECURITY-TOKEN: {sessionToken}
```

### 4. Place an Order
```http
POST https://api-capital.backend-capital.com/api/v1/orders
Content-Type: application/json
X-SECURITY-TOKEN: {sessionToken}

{
  "marketId": "US100",
  "direction": "BUY",
  "quantity": 1,
  "orderType": "MARKET"
}
```
**Response:**
```json
{
  "orderId": "78910",
  "status": "OPEN",
  ...
}
```

### 5. Check Order Status
```http
GET https://api-capital.backend-capital.com/api/v1/orders/{orderId}
X-SECURITY-TOKEN: {sessionToken}
```

**Summary for LLM:**  
The Capital.com API is REST-based, uses session tokens for authentication, and supports endpoints for account management, market data, and trading actions. You authenticate, then use the session token in headers for all subsequent requests. Most actions involve standard HTTP verbs (GET for data, POST for actions).

---

## Appendix: Lightweight Charts (v4+) Sample – Multiple Panels

The latest version of [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) (v4+) supports multiple panels, allowing you to display indicators (such as RSI) below the main price chart.

**Sample: Main chart with a panel below for RSI indicator**

```html
<!-- Include Lightweight Charts library -->
<script src="https://unpkg.com/lightweight-charts@latest/dist/lightweight-charts.standalone.production.js"></script>
<div id="chart" style="width: 600px; height: 400px;"></div>
<script>
  const chart = LightweightCharts.createChart(document.getElementById('chart'), {
    height: 400,
    width: 600,
    layout: { background: { color: '#fff' } },
    rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.3 } },
    panels: [
      { height: 70 }, // Panel for RSI (below)
    ],
  });

  // Main price series (candlesticks)
  const mainSeries = chart.addCandlestickSeries();
  mainSeries.setData([
    { time: 1682572800, open: 100, high: 105, low: 95, close: 102 },
    { time: 1682659200, open: 102, high: 110, low: 101, close: 108 },
    // ... more bar data
  ]);

  // RSI Indicator series in a separate panel below
  const rsiPanelIndex = 0; // first (and only) panel below main chart
  const rsiSeries = chart.addLineSeries({ panel: rsiPanelIndex, color: 'purple' });
  rsiSeries.setData([
    { time: 1682572800, value: 45 },
    { time: 1682659200, value: 60 },
    // ... more RSI data
  ]);
</script>
```

**Key Points:**
- `panels` option allows you to define additional panels below the main chart.
- Use `addLineSeries({ panel: n })` to attach a series to a specific panel.
- This enables you to render indicators (like RSI, MACD, etc.) below the main price chart.

For more examples and documentation, see the [official Lightweight Charts docs](https://tradingview.github.io/lightweight-charts/).
