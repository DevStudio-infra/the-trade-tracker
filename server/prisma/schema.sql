-- Create enum types first
CREATE TYPE "SubscriptionPlan" AS ENUM ('Free', 'Pro');

-- Create tables
CREATE TABLE "strategies" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" TEXT UNIQUE NOT NULL,
    "description" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "timeframes" TEXT[] NOT NULL,
    "riskParameters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "bot_instances" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "strategy_id" UUID NOT NULL,
    "pair" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "risk_settings" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("strategy_id") REFERENCES "strategies" ("id")
);

CREATE TABLE "rag_embeddings" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "strategy_id" UUID UNIQUE NOT NULL,
    "embedding" vector(1536),
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("strategy_id") REFERENCES "strategies" ("id")
);

CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "subscription_plan" TEXT NOT NULL DEFAULT 'Free',
    "credits" INTEGER NOT NULL DEFAULT 0,
    "onboarding_step" INTEGER NOT NULL DEFAULT 1,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login" TIMESTAMP(3)
);

CREATE TABLE "signals" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "bot_instance_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "stop_loss" DECIMAL NOT NULL,
    "take_profit" DECIMAL NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "chart_image_url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executed_at" TIMESTAMP(3),
    "trade_id" UUID UNIQUE,
    FOREIGN KEY ("bot_instance_id") REFERENCES "bot_instances" ("id"),
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE "trades" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "bot_instance_id" UUID NOT NULL,
    "signal_id" UUID UNIQUE,
    "pair" TEXT NOT NULL,
    "entry_price" DECIMAL NOT NULL,
    "exit_price" DECIMAL,
    "quantity" DECIMAL NOT NULL,
    "profit_loss" DECIMAL,
    "risk_percent" DECIMAL NOT NULL,
    "risk_reward" DECIMAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    FOREIGN KEY ("bot_instance_id") REFERENCES "bot_instances" ("id"),
    FOREIGN KEY ("signal_id") REFERENCES "signals" ("id"),
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE "ai_evaluations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "signal_id" UUID NOT NULL,
    "bot_instance_id" UUID NOT NULL,
    "eval_type" TEXT NOT NULL,
    "chart_image_url" TEXT NOT NULL,
    "prompt_used" TEXT NOT NULL,
    "llm_response" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,
    FOREIGN KEY ("signal_id") REFERENCES "signals" ("id"),
    FOREIGN KEY ("bot_instance_id") REFERENCES "bot_instances" ("id")
);

CREATE TABLE "user_onboarding" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT UNIQUE NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Not_Started',
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE "broker_credentials" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "broker_name" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE "credit_transactions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "credits_used" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE "credit_purchases" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "cost" DECIMAL NOT NULL,
    "payment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
);

CREATE TABLE "chart_images" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "signal_id" UUID NOT NULL,
    "timeframe" TEXT NOT NULL,
    "chart_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,
    FOREIGN KEY ("signal_id") REFERENCES "signals" ("id")
);

-- Create indexes
CREATE INDEX "signals_user_id_idx" ON "signals"("user_id");
CREATE INDEX "trades_user_id_idx" ON "trades"("user_id");
CREATE INDEX "bot_instances_user_id_idx" ON "bot_instances"("user_id");
CREATE INDEX "broker_credentials_user_id_idx" ON "broker_credentials"("user_id");
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");
