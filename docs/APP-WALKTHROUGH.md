### Full Trading Bot App Flow (Redis + RAG + Dynamic Confirmation + AI Credits)

#### Overview

This app is a **SaaS trading bot** that leverages **AI Agents** to generate, confirm, and execute trading signals across multiple asset classes (Forex, Stocks, Crypto). The system uses **Redis** to cache candle data, **LLM RAG (Retrieval-Augmented Generation)** to provide strategy insights, dynamic timeframe confirmation, and **AI Credits** for pricing and usage control.

---

### 1. User Flow

- User signs up on the platform.
- Connects their **Capital.com API key**.
- Selects:
  - Trading pairs (Forex, Stocks, or Crypto)
  - Timeframe (1H, 4H, Daily, etc.)
  - List of **Trading Strategies** from the available RAG Knowledge DB.
  - Risk % per trade
  - Subscription Plan (Free or Pro)

---

### 2. Candle Data Pipeline

#### What Will Be Cached?

✅ **OHLCV Candles** (latest **200 candles** for each selected pair & timeframe across all users)

#### Flow:

1. On app startup or user onboarding, the backend fetches **200 latest candles** via REST API from **Capital.com**.
2. The candles are stored in **Redis** with the key: `pair:{pair}:tf:{timeframe}:candles`
3. The cache automatically updates when a **new candle** arrives (via WebSocket or polling API).
4. TTL is set to match the selected timeframe duration (e.g., 1H → 1 Hour TTL).

---

### 3. Signal Detection (AI Call #1)

- When a **new candle** arrives, the backend fetches the **200 candles** from Redis.
- Chart Image generated via **Lightweight Charts (TradingView)** + Candle Data + Strategy List is sent to **AI Agent #1**.
- LLM uses RAG to cross-reference the strategy list and evaluate:
  - ✅ Buy Signal
  - 🔄 Mean Reversion Signal
  - ❌ No Signal
- The AI response includes:

```json
{
  "pair": "EURUSD",
  "signal": "BUY",
  "confidence": 78,
  "strategy": "EMA Pullback",
  "stop_loss": 1.1,
  "take_profit": 1.12,
  "risk_percent_score": 75
}
```

- **AI Credits Deduction:** This call costs **2 credits** from the user's quota.

---

### 4. Dynamic Confirmation (AI Call #2)

If confidence **>= 75%**, the system automatically triggers **AI Agent #2**.

#### Higher Timeframe Selection:

| User TF | Higher TF |
| ------- | --------- |
| 15M     | 1H        |
| 1H      | 4H        |
| 4H      | Daily     |
| Daily   | Weekly    |

The **confirmation request** contains:

- Higher TF Candles (latest 200 candles)

- Chart Image

- Original Signal

- **AI Credits Deduction:** This confirmation call costs **2 credits**.

---

### 5. Risk Management Service

The **Risk Service** calculates the final **Position Size** based on:

1. User-configured **Risk Range Preferences** (4% Max Risk - 1.25% Min Risk)
2. **AI Risk Percent Score** from the signal

Formula:

```
Allocated Risk = User Max Risk * (risk_percent_score / 100)
Position Size = (Balance * Allocated Risk) / (Entry Price - Stop Loss)
```

Example Risk Calculation Flow:

| User Max Risk | AI Risk Score | Allocated Risk | Position Size |
| ------------- | ------------- | -------------- | ------------- |
| 4%            | 75%           | 3%             | 0.3 Lots      |
| 4%            | 50%           | 2%             | 0.2 Lots      |

---

### 6. Order Execution

- Backend sends the order to **Capital.com API**.
- All orders are logged in **Supabase**.

---

### 7. Knowledge DB (RAG Implementation)

- The knowledge DB is stored in **Supabase with PGVector** for vector search.

- It contains pre-defined trading knowledge:
  - Trading strategies and patterns
  - Risk management rules
  - Market condition descriptions
  - Entry/exit rules
  - Confirmation criteria

Example Strategy in RAG:

```json
{
  "name": "EMA Pullback Strategy",
  "description": "Momentum strategy using EMA pullbacks",
  "rules": {
    "entry": "Enter long when price pulls back to 20 EMA in uptrend",
    "exit": "Exit when price breaks below 20 EMA or target reached",
    "filters": ["Uptrend on higher timeframe", "RSI above 40"],
    "timeframes": ["1H", "4H"]
  },
  "risk_management": {
    "stop_loss": "Below recent swing low",
    "take_profit": "2:1 minimum risk-reward",
    "position_size": "Based on ATR"
  }
}
```

### Bot Creation Flow

1. **User Creates Bot Instance**:

   - User selects trading pair (e.g., "EURUSD")
   - Chooses timeframe (e.g., "1H")
   - **Selects strategy** from available pre-defined strategies
   - Sets risk parameters
   - Configures optional filters

2. **Signal Detection with RAG**:

   - AI receives:
     - Chart image + market data
     - Selected strategy parameters
     - User's risk settings
   - RAG system enhances analysis by finding relevant knowledge
   - Generates signals according to selected strategy rules

3. **Final Analysis Example**:

```json
{
  "context": {
    "pair": "EURUSD",
    "timeframe": "1H",
    "strategy": "EMA Pullback Strategy"
  },
  "analysis": {
    "market_condition": "Uptrend with pullback to EMA",
    "strategy_rules_met": true,
    "filters_passed": ["Uptrend confirmed on 4H", "RSI at 45"]
  },
  "signal": {
    "type": "BUY",
    "entry": 1.05,
    "stop_loss": 1.047,
    "take_profit": 1.056,
    "confidence": 85
  },
  "reasoning": "Price pulling back to 20 EMA in confirmed uptrend. Higher timeframe trend aligned. Risk-reward ratio 2:1."
}
```

4. **Dynamic Prompt Engineering**:

```
Base Prompt: "Analyze this chart for trading opportunities..."
+ Market Context: "Current market conditions and price action..."
+ Selected Strategy: "Using EMA Pullback Strategy rules..."
+ Risk Parameters: "User's configured risk settings..."
= Final Prompt: "Analyze this chart for EMA pullback entries in uptrend, following the strategy's rules with user's risk parameters..."
```

---

### 8. Trade Logging

All trades are stored in **Supabase** with:

- User ID
- Pair
- Entry Price
- Risk %
- Confidence Score
- Strategy Used
- Confirmation Status

---

### 9. AI Credits System

#### Subscription Plans:

| Plan | Monthly Credits | Price  | Extra Credit Price |
| ---- | --------------- | ------ | ------------------ |
| Free | 6               | €0     | €0.22              |
| Pro  | 100             | €19.99 | €0.11              |

#### Credit Deduction Flow:

| Action                        | Credits Deducted |
| ----------------------------- | ---------------- |
| Signal Detection/Confirmation | 2                |

✅ The credit system automatically recharges monthly. ✅ Users can purchase extra credits at the listed prices.

---

### 10. User Dashboard Transparency Layer

#### Trade History (Signal Log)

| Field          | Description                    | Example                             |
| -------------- | ------------------------------ | ----------------------------------- |
| Pair           | Asset traded                   | **EURUSD**                          |
| Timeframe      | User-selected TF               | **4H**                              |
| Signal         | Type of signal                 | **BUY** / **SELL** / ❌ No Signal   |
| Confidence %   | AI Confidence Score            | **78%**                             |
| Strategy Used  | RAG Strategy Evaluated         | **EMA Pullback**                    |
| Date Generated | Time when Signal was generated | **2025-02-28 16:00**                |
| Confirmation   | Confirmation Result (if any)   | ✅ **Confirmed** or ❌ **Rejected** |

---

### Tech Stack Recap

| Component        | Tech                           |
| ---------------- | ------------------------------ |
| Backend API      | Node.js + Express.js           |
| Chart Generation | TradingView Lightweight Charts |
| Cache            | Redis                          |
| RAG DB           | Supabase + PGVector            |
| AI API           | Gemini - gemini-1.5-flash      |
| Broker API       | Capital.com                    |
| Frontend         | Next.js                        |
| Subscription     | Stripe                         |

Would you like me to generate the **Prisma Models + API Endpoints** for the Risk Service?
