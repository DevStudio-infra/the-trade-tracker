import { PrismaClient } from "@prisma/client";
import { initializeStorageBuckets } from "../config/supabase.config";
import { initRedis } from "../config/redis.config";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Starting database and storage initialization...");

    // Initialize Supabase storage buckets
    console.log("Initializing Supabase storage buckets...");
    await initializeStorageBuckets();

    // Initialize Redis
    console.log("Initializing Redis...");
    await initRedis();

    // Test database connection
    console.log("Testing database connection...");
    await prisma.$connect();
    console.log("Database connection successful");

    // Create initial strategies
    console.log("Creating initial trading strategies...");
    await prisma.strategy.createMany({
      skipDuplicates: true,
      data: [
        {
          name: "EMA Pullback",
          description: "A trend-following strategy that looks for pullbacks to the EMA in the direction of the trend.",
          rules: {
            description: "Price must pull back to 20 EMA in an uptrend. The higher timeframe must confirm the trend direction.",
            timeframes: ["15m", "1h", "4h"],
            indicators: ["EMA20", "RSI"],
          },
          timeframes: ["15m", "1h", "4h"],
          riskParameters: {
            stopLossMultiplier: 1.5,
            takeProfitMultiplier: 2.0,
            maxRiskPercent: 2,
          },
          isActive: true,
        },
        {
          name: "Mean Reversion",
          description: "A strategy that identifies overbought/oversold conditions and trades the reversion to the mean.",
          rules: {
            description: "Price must be significantly deviated from the moving average. Wait for a reversal candlestick pattern.",
            timeframes: ["15m", "1h", "4h"],
            indicators: ["EMA20", "RSI"],
          },
          timeframes: ["15m", "1h", "4h"],
          riskParameters: {
            stopLossMultiplier: 1.2,
            takeProfitMultiplier: 1.8,
            maxRiskPercent: 1.5,
          },
          isActive: true,
        },
      ],
    });

    console.log("Initialization completed successfully");
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
