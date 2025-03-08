# Database Schema Suggestion

## Users

- **id**: String (Primary Key, from Clerk)
- **created_at**: Timestamp
- **updated_at**: Timestamp
- **subscription_plan**: Enum (Free, Pro)
- **credits**: Integer
- **last_login**: Timestamp
- **onboarding_completed**: Boolean
- **onboarding_step**: Integer
- **is_active**: Boolean

## UserAgreements

- **id**: UUID (Primary Key)
- **user_id**: String (Foreign Key -> Users.id)
- **agreement_type**: Enum (Terms_Of_Service, Privacy_Policy, Data_Processing)
- **version**: String
- **accepted_at**: Timestamp
- **ip_address**: String
- **user_agent**: String
- **metadata**: JSONB

Example of metadata JSONB:

```json
{
  "acceptance_method": "onboarding_flow",
  "locale": "en-US",
  "additional_consents": {
    "marketing_emails": true,
    "data_sharing": false
  }
}
```

## UserOnboarding

- **id**: UUID (Primary Key)
- **user_id**: String (Foreign Key -> Users.id)
- **step**: Integer
- **status**: Enum (Not_Started, In_Progress, Completed)
- **data**: JSONB
- **created_at**: Timestamp
- **updated_at**: Timestamp

Example of data JSONB:

```json
{
  "steps_completed": [
    {
      "step": 1,
      "name": "terms_acceptance",
      "completed_at": "2024-03-07T12:00:00Z"
    },
    {
      "step": 2,
      "name": "trading_experience",
      "completed_at": "2024-03-07T12:05:00Z",
      "data": {
        "years_trading": 5,
        "preferred_markets": ["forex", "crypto"],
        "risk_tolerance": "medium"
      }
    }
  ],
  "current_step": 3,
  "remaining_steps": ["broker_connection", "strategy_selection"]
}
```

## BrokerCredentials

- **id**: UUID (Primary Key)
- **user_id**: String (Foreign Key -> Users.id)
- **broker_name**: String (Capital.com, MetaTrader, Interactive Brokers, etc.)
- **credentials**: JSONB (Encrypted, stores API keys and other broker-specific credentials)
- **is_active**: Boolean
- **last_used**: Timestamp
- **created_at**: Timestamp
- **updated_at**: Timestamp
- **metadata**: JSONB (Additional broker-specific settings)

Example of credentials JSONB structure:

```json
{
  "api_key": "encrypted_api_key",
  "api_secret": "encrypted_secret",
  "account_id": "trading_account_id",
  "demo_mode": false,
  "permissions": ["read", "trade"],
  "additional_settings": {
    "leverage": "1:30",
    "default_lot_size": "0.01"
  }
}
```

## Trades

- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key -> Users.id)
- **pair**: String
- **entry_price**: Decimal
- **exit_price**: Decimal
- **quantity**: Decimal
- **profit_loss**: Decimal
- **created_at**: Timestamp
- **closed_at**: Timestamp
- **strategy_used**: String
- **confidence_score**: Integer

## Signals

- **id**: UUID (Primary Key)
- **user_id**: String (Foreign Key -> Users.id)
- **pair**: String
- **timeframe**: String
- **signal_type**: Enum (Buy, Sell, No Signal)
- **confidence**: Integer
- **strategy**: String
- **stop_loss**: Decimal
- **take_profit**: Decimal
- **risk_percent_score**: Integer
- **chart_image_url**: String (Supabase Storage URL)
- **status**: Enum (Pending_Confirmation, Confirmed, Rejected, Executed)
- **created_at**: Timestamp
- **executed_at**: Timestamp
- **trade_id**: UUID (Foreign Key -> Trades.id, nullable)

## AI_Evaluations

- **id**: UUID (Primary Key)
- **signal_id**: UUID (Foreign Key -> Signals.id)
- **evaluation_type**: Enum (Initial_Analysis, Confirmation)
- **chart_image_url**: String (Supabase Storage URL)
- **prompt_used**: Text
- **llm_response**: JSONB
- **created_at**: Timestamp
- **metadata**: JSONB

Example of llm_response JSONB:

```json
{
  "analysis": {
    "market_condition": "Uptrend with strong momentum",
    "key_levels": [1.234, 1.236],
    "indicators": {
      "ema": "Price above 20 EMA",
      "rsi": "65 - Not overbought"
    }
  },
  "reasoning": "Price showing strong momentum with key support at 1.2340",
  "confidence_score": 85,
  "recommended_action": "BUY",
  "risk_assessment": {
    "stop_loss": 1.232,
    "take_profit": 1.24,
    "risk_reward_ratio": 2.5
  }
}
```

Example of metadata JSONB:

```json
{
  "model_version": "gemini-1.5-flash",
  "chart_timeframe": "4H",
  "indicators_used": ["EMA", "RSI", "Support/Resistance"],
  "processing_time_ms": 450
}
```

## Chart_Images

- **id**: UUID (Primary Key)
- **signal_id**: UUID (Foreign Key -> Signals.id)
- **timeframe**: String
- **chart_type**: Enum (Analysis, Confirmation, Post_Trade)
- **storage_path**: String (Supabase Storage path)
- **public_url**: String
- **created_at**: Timestamp
- **metadata**: JSONB

Example of metadata JSONB:

```json
{
  "indicators": ["EMA(20)", "RSI(14)"],
  "canvas_size": "1200x800",
  "theme": "dark",
  "candlestick_count": 200
}
```

## Credit_Purchases

- **id**: UUID (Primary Key)
- **user_id**: String (Foreign Key -> Users.id)
- **amount**: Integer
- **cost**: Decimal
- **payment_id**: String (Stripe Payment ID)
- **status**: Enum (Pending, Completed, Failed)
- **created_at**: Timestamp

## Credit_Transactions

- **id**: UUID (Primary Key)
- **user_id**: String (Foreign Key -> Users.id)
- **credits_used**: Integer
- **action**: Enum (Signal_Detection, Confirmation)
- **signal_id**: UUID (Foreign Key -> Signals.id, nullable)
- **balance_before**: Integer
- **balance_after**: Integer
- **created_at**: Timestamp
- **metadata**: JSONB (Additional context about the transaction)

Example of metadata JSONB:

```json
{
  "pair": "EURUSD",
  "timeframe": "4H",
  "strategy_used": "EMA Pullback",
  "request_type": "confirmation"
}
```

## Strategies

- **id**: UUID (Primary Key)
- **name**: String (Unique)
- **description**: Text
- **rules**: Text
- **confirmation_tf**: String

## RAG_Embeddings

- **id**: UUID (Primary Key)
- **strategy_id**: UUID (Foreign Key -> Strategies.id)
- **embedding**: Vector
- **created_at**: Timestamp

## Leaderboard

- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key -> Users.id)
- **total_profit**: Decimal
- **win_rate**: Decimal
- **risk_reward_ratio**: Decimal
- **sharpe_ratio**: Decimal
- **created_at**: Timestamp

## Achievements

- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key -> Users.id)
- **achievement_type**: String
- **description**: Text
- **created_at**: Timestamp

## Notifications

- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key -> Users.id)
- **type**: String (Trade Alert, Strategy Update, Performance Notification)
- **message**: Text
- **read**: Boolean
- **created_at**: Timestamp

## Messages

- **id**: UUID (Primary Key)
- **sender_id**: UUID (Foreign Key -> Users.id)
- **receiver_id**: UUID (Foreign Key -> Users.id)
- **content**: Text
- **created_at**: Timestamp

## Follow_System

- **id**: UUID (Primary Key)
- **follower_id**: UUID (Foreign Key -> Users.id)
- **followed_id**: UUID (Foreign Key -> Users.id)
- **created_at**: Timestamp

## Analytics

- **id**: UUID (Primary Key)
- **user_id**: UUID (Foreign Key -> Users.id)
- **performance_data**: JSONB
- **created_at**: Timestamp

This schema is designed to support the application's features, including user management, trading operations, AI signal detection, and user analytics. Each table is structured to capture the necessary data for its respective domain, with relationships that facilitate efficient data retrieval and manipulation.
