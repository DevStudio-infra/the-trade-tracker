# Chart Rendering & AI Evaluation Flow

## Overview

This document outlines the architecture and implementation details for:

1. Fetching and rendering trading charts
2. Caching OHLCV data in Redis for all users
3. Handling the AI evaluation process using selected strategies and user input

## Chart Data Flow

### 1. User Selections

- User selects a **trading pair** (e.g., EURUSD)
- User selects a **timeframe** (e.g., 1H, 4H, Daily)
- User selects a **strategy** from their saved strategies
- User provides optional **additional text input**

### 2. OHLCV Data Fetching & Caching

#### Initial Data Load

1. When a user selects a pair and timeframe, the client sends a request to the server
2. Server checks Redis cache with key: `pair:{pair}:tf:{timeframe}:candles`
3. If data exists in cache, return it immediately
4. If not, fetch the last 200 candles from Capital.com API
5. Store fetched data in Redis with TTL matching the timeframe duration
   - Example: 1H timeframe = 1 hour TTL
   - Example: 4H timeframe = 4 hours TTL

```
REDIS KEY STRUCTURE:
pair:EURUSD:tf:1H:candles → [Array of 200 OHLCV candles]
```

#### Update Mechanism

There are two approaches we can implement:

**Option A: WebSocket Connection (Recommended)**

1. After initial data load, establish a WebSocket connection to Capital.com for the selected pair
2. When a new candle arrives via WebSocket:
   - Add the new candle to the Redis cache
   - Remove the oldest candle to maintain 200 candles
   - Broadcast the new candle to all connected clients watching this pair/timeframe
   - Reset the TTL for the cache key

**Option B: Polling Mechanism**

1. Server polls Capital.com API at intervals based on timeframe
   - 1M timeframe: poll every 30 seconds
   - 5M timeframe: poll every 2.5 minutes
   - 1H timeframe: poll every 30 minutes
2. When new data is received:
   - Update Redis cache
   - Reset TTL
   - Notify clients via Server-Sent Events or WebSocket

### 3. Client Chart Rendering

1. Client receives OHLCV data
2. Renders chart using TradingView Lightweight Charts
3. Updates chart in real-time as new candles arrive

#### Performance Benefits

- As more users access the same pair/timeframe, the Redis cache is used more efficiently
- The system makes fewer API calls to Capital.com
- New users benefit from already-cached data
- Server load is distributed across users requesting different pairs

## AI Evaluation Process

### 1. User Initiates Analysis

1. User selects a **saved strategy** from their list
2. User adds optional **text input** for additional context
3. User clicks "Analyze Chart" button

### 2. Preparing Analysis Request

The client sends a POST request to `/api/v1/signals/analyze` with:

```json
{
  "pair": "EURUSD",
  "timeframe": "1H",
  "strategyId": "strategy-uuid-123",
  "additionalContext": "Look for a breakout opportunity after consolidation"
}
```

### 3. Server-Side Processing

1. Server validates the request
2. Retrieves the latest OHLCV data from Redis cache
3. Generates a chart image using server-side rendering of TradingView charts
4. Fetches the selected strategy details from the database
5. Prepares the AI prompt with:
   - Chart image
   - OHLCV data
   - Strategy details
   - User's additional context
   - Any relevant market conditions

### 4. AI Signal Detection (First LLM Call)

1. Send the prepared prompt to the AI service
2. LLM uses RAG to cross-reference the strategy and evaluate the chart
3. AI returns the analysis:

```json
{
  "pair": "EURUSD",
  "timeframe": "1H",
  "signal": "BUY",
  "confidence": 78,
  "strategy": "EMA Pullback",
  "entry": 1.105,
  "stop_loss": 1.1,
  "take_profit": 1.115,
  "risk_percent_score": 75,
  "reasoning": "Price is showing a pullback to the 20 EMA in an uptrend, with RSI indicating oversold conditions. The user's context about a breakout opportunity aligns with current consolidation pattern."
}
```

4. Deduct 2 AI credits from user's quota

### 5. Dynamic Confirmation (Optional Second LLM Call)

If the confidence is >= 75%, the system automatically initiates a confirmation:

1. Fetch data for a higher timeframe:
   - 15M → 1H
   - 1H → 4H
   - 4H → Daily
   - Daily → Weekly
2. Generate a chart image for the higher timeframe
3. Send a second prompt to the AI service with both timeframes
4. Deduct 2 more AI credits from user's quota

### 6. Response to Client

Send the complete analysis back to the client:

```json
{
  "signal": {
    "pair": "EURUSD",
    "timeframe": "1H",
    "type": "BUY",
    "confidence": 78,
    "strategy": "EMA Pullback",
    "entry": 1.105,
    "stop_loss": 1.1,
    "take_profit": 1.115,
    "risk_percent_score": 75,
    "reasoning": "Price is showing a pullback to the 20 EMA in an uptrend..."
  },
  "confirmation": {
    "higherTimeframe": "4H",
    "isConfirmed": true,
    "confidence": 82,
    "reasoning": "The 4H timeframe confirms the uptrend with strong support..."
  },
  "riskManagement": {
    "recommendedPositionSize": 0.3,
    "allocatedRisk": 3,
    "potentialProfit": "$30",
    "potentialLoss": "$15"
  },
  "creditsUsed": 4
}
```

## Implementation Plan

### Phase 1: Chart Rendering & Data Caching

1. Create Redis cache service for OHLCV data
2. Implement API endpoints to fetch candle data
3. Create TradingView Lightweight Charts integration in client
4. Set up the initial data fetching and caching logic

### Phase 2: Real-time Updates

1. Implement WebSocket connection to Capital.com
2. Create WebSocket server for broadcasting updates to clients
3. Add logic to update Redis cache with new candles
4. Implement client-side update mechanism

### Phase 3: AI Evaluation

1. Create the strategy selection UI in the client
2. Implement server-side chart image generation
3. Build the AI prompt construction service
4. Create the signal detection API endpoint
5. Implement dynamic confirmation mechanism

### Phase 4: Response Handling & UI

1. Develop the signal display UI
2. Create the confirmation visualization
3. Implement risk management calculations
4. Add AI credit tracking and management

## Technical Challenges & Solutions

### 1. Ensuring Real-time Chart Updates

**Challenge**: Maintaining real-time chart updates without excessive API calls
**Solution**: WebSocket connections with Redis pub/sub for efficient broadcasting

### 2. Server-side Chart Generation

**Challenge**: Generating chart images on the server for AI analysis
**Solution**: Use Node.js canvas library with TradingView Lightweight Charts or a dedicated charting service

### 3. Cache Coherence

**Challenge**: Ensuring all users have access to the latest data
**Solution**: Implement proper TTL and update mechanisms with atomic Redis operations

### 4. Scalability

**Challenge**: Supporting many users accessing different pairs/timeframes
**Solution**: Implement efficient caching strategies and consider Redis clustering for high loads

## Next Steps

1. Create Redis cache service and data models
2. Implement the OHLCV data fetching and caching endpoints
3. Develop the client-side chart rendering component
4. Set up the strategy selection UI
5. Begin implementing the AI evaluation API endpoints
