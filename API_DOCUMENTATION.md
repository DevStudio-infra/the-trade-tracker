# Trade Tracker API Documentation

## Base URL

```
Production: https://api.tradetracker.com/v1
Development: http://localhost:3001/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

The token is obtained from Clerk authentication.

## Rate Limiting

- Free tier: 60 requests per minute
- Pro tier: 300 requests per minute

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional additional error details
  }
}
```

## API Endpoints

### Authentication & User Management

#### GET /user/profile

Get current user's profile information.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "subscription_plan": "pro",
    "credits": 100,
    "onboarding_completed": true,
    "onboarding_step": 4,
    "created_at": "2024-03-07T12:00:00Z",
    "broker_connected": true
  }
}
```

#### PATCH /user/profile

Update user profile settings.

**Request:**

```json
{
  "risk_preferences": {
    "max_risk_per_trade": 4,
    "preferred_leverage": "1:30"
  }
}
```

### Broker Integration

#### POST /broker/connect

Connect a new broker account.

**Request:**

```json
{
  "broker": "capital_com",
  "credentials": {
    "api_key": "your_api_key",
    "api_secret": "your_api_secret"
  },
  "is_demo": false
}
```

#### GET /broker/connections

List all broker connections.

**Response:**

```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "conn_123",
        "broker": "capital_com",
        "is_active": true,
        "is_demo": false,
        "last_used": "2024-03-07T12:00:00Z",
        "status": "connected"
      }
    ]
  }
}
```

### Trading Operations

#### GET /trading/pairs

Get available trading pairs.

**Query Parameters:**

- `type`: "forex" | "crypto" | "stocks"
- `search`: Optional search term

**Response:**

```json
{
  "success": true,
  "data": {
    "pairs": [
      {
        "symbol": "EURUSD",
        "type": "forex",
        "min_lot": 0.01,
        "max_lot": 100,
        "pip_value": 0.0001
      }
    ]
  }
}
```

#### POST /trading/order

Place a new trading order.

**Request:**

```json
{
  "pair": "EURUSD",
  "type": "MARKET",
  "side": "BUY",
  "quantity": 0.1,
  "stop_loss": 1.05,
  "take_profit": 1.06
}
```

#### GET /trading/positions

Get open positions.

**Response:**

```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "pos_123",
        "pair": "EURUSD",
        "side": "BUY",
        "quantity": 0.1,
        "entry_price": 1.055,
        "current_price": 1.056,
        "pnl": 10.0,
        "pnl_percentage": 0.94,
        "stop_loss": 1.05,
        "take_profit": 1.06,
        "created_at": "2024-03-07T12:00:00Z"
      }
    ]
  }
}
```

### Signal Detection

#### POST /signals/analyze

Request signal analysis for a pair.

**Request:**

```json
{
  "pair": "EURUSD",
  "timeframe": "4H",
  "strategies": ["EMA_Pullback", "Mean_Reversion"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "signal_id": "sig_123",
    "pair": "EURUSD",
    "signal_type": "BUY",
    "confidence": 85,
    "strategy": "EMA_Pullback",
    "stop_loss": 1.05,
    "take_profit": 1.06,
    "risk_percent_score": 75,
    "chart_image_url": "https://storage.tradetracker.com/charts/sig_123.png",
    "analysis": {
      "market_condition": "Uptrend with strong momentum",
      "key_levels": [1.05, 1.06],
      "indicators": {
        "ema": "Price above 20 EMA",
        "rsi": "65 - Not overbought"
      }
    }
  }
}
```

#### GET /signals/history

Get signal history.

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: "pending" | "confirmed" | "rejected" | "executed"

**Response:**

```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "sig_123",
        "pair": "EURUSD",
        "timeframe": "4H",
        "signal_type": "BUY",
        "confidence": 85,
        "strategy": "EMA_Pullback",
        "status": "executed",
        "created_at": "2024-03-07T12:00:00Z",
        "chart_image_url": "https://storage.tradetracker.com/charts/sig_123.png"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "total_pages": 8
    }
  }
}
```

### Credits Management

#### GET /credits/balance

Get current credit balance.

**Response:**

```json
{
  "success": true,
  "data": {
    "credits": 100,
    "subscription_plan": "pro",
    "next_renewal": "2024-04-07T12:00:00Z"
  }
}
```

#### POST /credits/purchase

Purchase additional credits.

**Request:**

```json
{
  "amount": 50,
  "payment_method": "stripe"
}
```

#### GET /credits/transactions

Get credit transaction history.

**Response:**

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_123",
        "type": "DEDUCTION",
        "amount": 2,
        "action": "SIGNAL_DETECTION",
        "balance_before": 102,
        "balance_after": 100,
        "created_at": "2024-03-07T12:00:00Z"
      }
    ]
  }
}
```

### Analytics & Performance

#### GET /analytics/performance

Get trading performance metrics.

**Query Parameters:**

- `timeframe`: "day" | "week" | "month" | "year"
- `start_date`: ISO date string
- `end_date`: ISO date string

**Response:**

```json
{
  "success": true,
  "data": {
    "total_trades": 150,
    "win_rate": 65.5,
    "profit_loss": 1250.5,
    "profit_loss_percentage": 12.5,
    "average_risk_reward": 2.1,
    "largest_win": 500.0,
    "largest_loss": -200.0,
    "sharpe_ratio": 1.8,
    "chart_data": {
      "labels": ["2024-03-01", "2024-03-02"],
      "equity_curve": [10000, 10125],
      "win_loss": [1, -1]
    }
  }
}
```

### WebSocket API

Connect to WebSocket for real-time updates:

```
wss://api.tradetracker.com/v1/ws
```

**Authentication:**
Send authentication message after connection:

```json
{
  "type": "auth",
  "token": "your_bearer_token"
}
```

**Available Subscriptions:**

1. Price Updates:

```json
{
  "type": "subscribe",
  "channel": "prices",
  "pairs": ["EURUSD", "GBPUSD"]
}
```

2. Position Updates:

```json
{
  "type": "subscribe",
  "channel": "positions"
}
```

3. Signal Alerts:

```json
{
  "type": "subscribe",
  "channel": "signals"
}
```

**Example Messages:**

Price Update:

```json
{
  "type": "price_update",
  "data": {
    "pair": "EURUSD",
    "bid": 1.055,
    "ask": 1.0551,
    "timestamp": "2024-03-07T12:00:00.123Z"
  }
}
```

Position Update:

```json
{
  "type": "position_update",
  "data": {
    "id": "pos_123",
    "pair": "EURUSD",
    "current_price": 1.056,
    "pnl": 10.0,
    "pnl_percentage": 0.94
  }
}
```

Signal Alert:

```json
{
  "type": "signal_alert",
  "data": {
    "signal_id": "sig_123",
    "pair": "EURUSD",
    "signal_type": "BUY",
    "confidence": 85,
    "chart_image_url": "https://storage.tradetracker.com/charts/sig_123.png"
  }
}
```

## Error Codes

| Code                 | Description                |
| -------------------- | -------------------------- |
| AUTH_REQUIRED        | Authentication is required |
| INVALID_CREDENTIALS  | Invalid API credentials    |
| INSUFFICIENT_CREDITS | Not enough credits         |
| INVALID_PAIR         | Invalid trading pair       |
| INVALID_ORDER        | Invalid order parameters   |
| BROKER_ERROR         | Broker API error           |
| RATE_LIMIT_EXCEEDED  | Too many requests          |
| INVALID_SUBSCRIPTION | Invalid subscription plan  |

## Pagination

For endpoints that return lists, pagination is supported via query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

Response includes pagination metadata:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "total_pages": 8
    }
  }
}
```

## Rate Limiting Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1583580000
```
