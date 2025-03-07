import { PrismaClient } from "@prisma/client";
import { initializeStorageBuckets } from "../config/supabase.config";
import { initializeRedis } from "../config/redis.config";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Starting database and storage initialization...");

    // Initialize Supabase storage buckets
    console.log("Initializing Supabase storage buckets...");
    await initializeStorageBuckets();

    // Initialize Redis
    console.log("Initializing Redis...");
    await initializeRedis();

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
          rules: "Price must pull back to 20 EMA in an uptrend. The higher timeframe must confirm the trend direction.",
          confirmationTf: "4h",
        },
        {
          name: "Mean Reversion",
          description: "A strategy that identifies overbought/oversold conditions and trades the reversion to the mean.",
          rules: "Price must be significantly deviated from the moving average. Wait for a reversal candlestick pattern.",
          confirmationTf: "1h",
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
