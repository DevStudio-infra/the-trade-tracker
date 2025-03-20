import { Router, Request, Response } from "express";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { createLogger } from "../../utils/logger";
import { PrismaClient } from "@prisma/client";
import { BrokerService } from "../../services/broker/broker.service";
import { CapitalComAPI } from "../../services/broker/capital-com/api";
import { redis, getCandleData, setCandleData, REDIS_KEYS, TTL } from "../../config/redis.config";

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const router = Router();
const logger = createLogger("candles-routes");
const prisma = new PrismaClient();
const brokerService = new BrokerService();

/**
 * Get candle data for a trading pair, credentials, and timeframe
 * This endpoint checks Redis cache first and fetches from the broker API if needed
 */
router.post("/", validateAuth, async (req: Request, res: Response) => {
  const { userId, email = "unknown" } = (req as AuthenticatedRequest).auth;

  // Validate request body
  const { tradingPair, timeframe, credentialsId } = req.body;

  if (!tradingPair || !timeframe || !credentialsId) {
    logger.error({
      message: "Missing required fields in request body",
      userId,
      email,
      body: req.body,
    });

    return res.status(400).json({
      success: false,
      message: "Missing required fields: tradingPair, timeframe, and credentialsId are required",
    });
  }

  // Log the received data in a formatted, human-readable way
  console.log("=================================================");
  console.log("🔔 TRADE SELECTION RECEIVED");
  console.log("-------------------------------------------------");
  console.log(`👤 User: ${email || userId}`);
  console.log(`💱 Trading Pair: ${tradingPair}`);
  console.log(`⏲️ Timeframe: ${timeframe}`);
  console.log(`🔑 Broker Credential: ${credentialsId}`);
  console.log(`📅 Time: ${new Date().toISOString()}`);
  console.log("=================================================");

  try {
    // Check if timeframe is valid
    if (!Object.keys(TTL).includes(timeframe)) {
      logger.warn({
        message: "Invalid timeframe requested",
        timeframe,
        userId,
        validTimeframes: Object.keys(TTL),
      });

      return res.status(400).json({
        success: false,
        message: "Invalid timeframe",
        validTimeframes: Object.keys(TTL),
      });
    }

    // Check Redis cache first
    let cachedData: Candle[] | null = null;
    try {
      const cacheKey = REDIS_KEYS.CANDLES(tradingPair, timeframe);

      logger.info({
        message: "Checking Redis cache",
        tradingPair,
        timeframe,
        userId,
        cacheKey,
      });

      cachedData = await getCandleData<Candle[]>(tradingPair, timeframe);
    } catch (cacheError) {
      // Log cache error but continue with API fallback
      logger.error({
        message: "Redis cache error - will attempt API fallback",
        error: cacheError instanceof Error ? cacheError.message : "Unknown error",
        stack: cacheError instanceof Error ? cacheError.stack : undefined,
        tradingPair,
        timeframe,
        userId,
      });
      // Continue with null cachedData
    }

    // If data exists in cache and is valid, return it
    if (cachedData && Array.isArray(cachedData) && cachedData.length > 0) {
      console.log("=================================================");
      console.log("🔄 CACHED DATA ACCESSED");
      console.log("-------------------------------------------------");
      console.log(`💱 Pair: ${tradingPair}`);
      console.log(`⏲️ Timeframe: ${timeframe}`);
      console.log(`📊 Candles: ${cachedData.length}`);
      console.log("=================================================");

      // Return cached data and log
      console.log("=================================================");
      console.log("✅ TRADE DATA SENT");
      console.log("-------------------------------------------------");
      console.log(`👤 User: ${email || userId}`);
      console.log(`💱 Pair: ${tradingPair}`);
      console.log(`⏲️ Timeframe: ${timeframe}`);
      console.log(`📊 Candles: ${cachedData.length}`);
      console.log(`🔄 Source: From Redis cache`);
      console.log("=================================================");

      return res.json({
        success: true,
        message: "Candle data retrieved from cache",
        data: {
          tradingPair,
          timeframe,
          candles: cachedData,
          source: "cache",
        },
      });
    }

    // If not in cache or cache error, fetch from broker API
    // First, get the broker credentials
    logger.info({
      message: "Cache miss - fetching broker credentials",
      tradingPair,
      timeframe,
      credentialsId,
      userId,
    });

    const connection = await prisma.brokerCredential.findFirst({
      where: {
        id: credentialsId,
        user_id: userId,
      },
    });

    if (!connection) {
      logger.warn({
        message: "Broker credentials not found",
        credentialsId,
        userId,
      });

      return res.status(404).json({
        success: false,
        message: "Broker credentials not found",
      });
    }

    // Get the broker API
    const BrokerAPI = brokerService.getBrokerAPI(connection.broker_name);

    if (!BrokerAPI) {
      logger.warn({
        message: "Unsupported broker",
        broker: connection.broker_name,
        userId,
      });

      return res.status(400).json({
        success: false,
        message: `Unsupported broker: ${connection.broker_name}`,
      });
    }

    // Get decrypted credentials
    logger.info({
      message: "Getting decrypted credentials and initializing broker API",
      broker: connection.broker_name,
      userId,
    });

    const decryptedCredentials = brokerService.getDecryptedCredentials(connection);

    // Initialize the broker API
    console.log("=================================================");
    console.log("🔌 CONNECTING TO BROKER API");
    console.log("-------------------------------------------------");
    console.log(`💱 Pair: ${tradingPair}`);
    console.log(`⏲️ Timeframe: ${timeframe}`);
    console.log(`🏢 Broker: ${connection.broker_name}`);
    console.log("=================================================");

    const api = new BrokerAPI(decryptedCredentials.apiKey, decryptedCredentials.identifier, decryptedCredentials.password);

    try {
      // Fetch candles from the broker API
      logger.info({
        message: "Fetching candles from broker API",
        tradingPair,
        timeframe,
        broker: connection.broker_name,
      });

      const candles = await api.getCandles(tradingPair, timeframe, 200);

      // Validate candles data
      if (!Array.isArray(candles)) {
        throw new Error(`Invalid candles data returned: expected array, got ${typeof candles}`);
      }

      if (candles.length === 0) {
        logger.warn({
          message: "Broker API returned empty candles array",
          tradingPair,
          timeframe,
        });
      }

      // Store in Redis cache
      if (candles && Array.isArray(candles) && candles.length > 0) {
        logger.info({
          message: "Storing fetched candles in Redis cache",
          count: candles.length,
          tradingPair,
          timeframe,
        });

        // Use a non-blocking approach to cache data
        try {
          // Don't await this to prevent blocking if Redis is slow
          setCandleData(tradingPair, timeframe as keyof typeof TTL, candles)
            .then(() => {
              console.log("=================================================");
              console.log("💾 DATA CACHED");
              console.log("-------------------------------------------------");
              console.log(`💱 Pair: ${tradingPair}`);
              console.log(`⏲️ Timeframe: ${timeframe}`);
              console.log(`📊 Candles: ${candles.length}`);
              console.log(`⏱️ TTL: ${TTL[timeframe as keyof typeof TTL]} seconds`);
              console.log("=================================================");
            })
            .catch((cachingError) => {
              // Log but don't fail the request
              logger.error({
                message: "Failed to cache candles, but continuing to return data to client",
                error: cachingError instanceof Error ? cachingError.message : "Unknown error",
                tradingPair,
                timeframe,
              });
            });
        } catch (cacheInitError) {
          // Log synchronous errors, but don't block the response
          logger.error({
            message: "Error initializing cache operation, but continuing to return data to client",
            error: cacheInitError instanceof Error ? cacheInitError.message : "Unknown error",
            tradingPair,
            timeframe,
          });
        }
      }

      // Return the data
      console.log("=================================================");
      console.log("✅ TRADE DATA SENT");
      console.log("-------------------------------------------------");
      console.log(`👤 User: ${email || userId}`);
      console.log(`💱 Pair: ${tradingPair}`);
      console.log(`⏲️ Timeframe: ${timeframe}`);
      console.log(`📊 Candles: ${candles.length}`);
      console.log(`🔄 Source: Fresh from broker API`);
      console.log("=================================================");

      return res.json({
        success: true,
        message: "Candle data retrieved from broker API",
        data: {
          tradingPair,
          timeframe,
          candles,
          source: "api",
        },
      });
    } catch (brokerError) {
      // Specific error handling for broker API issues
      logger.error({
        message: "Error fetching candles from broker API",
        error: brokerError instanceof Error ? brokerError.message : "Unknown error",
        stack: brokerError instanceof Error ? brokerError.stack : undefined,
        tradingPair,
        timeframe,
        broker: connection.broker_name,
      });

      return res.status(500).json({
        success: false,
        message: "Failed to fetch candle data from broker",
        error: brokerError instanceof Error ? brokerError.message : "Unknown error",
      });
    }
  } catch (error) {
    logger.error({
      message: "Error retrieving candle data",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      tradingPair,
      timeframe,
      credentialsId,
      userId,
    });

    console.log("=================================================");
    console.log("❌ ERROR RETRIEVING TRADE DATA");
    console.log("-------------------------------------------------");
    console.log(`👤 User: ${email || userId}`);
    console.log(`💱 Pair: ${tradingPair}`);
    console.log(`⏲️ Timeframe: ${timeframe}`);
    console.log(`🔑 Broker Credential: ${credentialsId}`);
    console.log(`⚠️ Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    console.log("=================================================");

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve candle data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
