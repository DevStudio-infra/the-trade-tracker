import { Router, Response, Request } from "express";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { BrokerService } from "../../services/broker/broker.service";
import { createLogger } from "../../utils/logger";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../../utils/encryption.utils";
import { CapitalComAPI } from "../../services/broker/capital-com/api";
import { PairsCacheService } from "../../services/cache/pairs-cache.service";

// Define the TradingPair interface
interface TradingPair {
  symbol: string;
  name: string;
  displayName: string;
  type: string;
  minQuantity: number;
  maxQuantity: number;
  precision: number;
}

const router = Router();
const logger = createLogger("broker-routes");
const brokerService = new BrokerService();
const prisma = new PrismaClient();
const pairsCache = new PairsCacheService(prisma);

// Simple request cache to prevent duplicate requests
interface CacheEntry {
  data: any;
  timestamp: number;
  expiresIn: number; // milliseconds
}

const requestCache = new Map<string, CacheEntry>();

// Cache middleware for GET requests
const withCache =
  (ttlMs = 60000) =>
  (req: Request, res: Response, next: Function) => {
    // Only cache GET requests
    if (req.method !== "GET") return next();

    const cacheKey = `${req.originalUrl}_${(req as AuthenticatedRequest).auth?.userId}`;
    const cachedResponse = requestCache.get(cacheKey);

    if (cachedResponse && Date.now() - cachedResponse.timestamp < cachedResponse.expiresIn) {
      logger.info(`Cache hit for ${cacheKey}`);
      return res.json(cachedResponse.data);
    }

    // Store the original send function
    const originalSend = res.send;

    // Override the send function to cache the response
    res.send = function (body) {
      try {
        const data = JSON.parse(body);
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          expiresIn: ttlMs,
        });
        logger.info(`Cached response for ${cacheKey}`);
      } catch (e) {
        logger.warn(`Failed to cache response for ${cacheKey}`);
      }

      return originalSend.call(this, body);
    };

    next();
  };

// Get all broker connections
router.get("/connections", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const connections = await brokerService.getConnections(userId);
    res.json(connections);
  } catch (error) {
    logger.error({
      message: "Error fetching broker connections",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to fetch broker connections" });
  }
});

// Add new broker connection
router.post("/connect", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { broker_name, credentials, description, is_demo } = req.body;

    if (!credentials?.apiKey || !credentials?.identifier || !credentials?.password) {
      return res.status(400).json({ error: "Missing required credentials" });
    }

    const connection = await brokerService.addConnection(
      userId,
      broker_name,
      {
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
      },
      description,
      is_demo || false // Pass is_demo field with default to false
    );

    res.json(connection);
  } catch (error) {
    logger.error({
      message: "Error adding broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to add broker connection" });
  }
});

// Update broker connection
router.patch("/connections/:connectionId", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { connectionId } = req.params;
    const { is_active, credentials, description, is_demo } = req.body;

    const connection = await brokerService.updateConnection(userId, connectionId, {
      is_active,
      credentials,
      description,
      is_demo,
    });

    res.json(connection);
  } catch (error) {
    logger.error({
      message: "Error updating broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to update broker connection" });
  }
});

// Delete broker connection
router.delete("/connections/:connectionId", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { connectionId } = req.params;

    await brokerService.deleteConnection(userId, connectionId);
    res.json({ success: true });
  } catch (error) {
    logger.error({
      message: "Error deleting broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to delete broker connection" });
  }
});

// Validate broker connection
router.post("/connections/:connectionId/validate", validateAuth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const isValid = await brokerService.validateConnection(connectionId);

    res.json({ isValid });
  } catch (error) {
    logger.error({
      message: "Error validating broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to validate broker connection" });
  }
});

// Get trading pairs for a broker connection
router.get("/connections/:connectionId/pairs", validateAuth, withCache(30000), async (req: Request, res: Response) => {
  const { connectionId } = req.params;
  const { userId } = (req as AuthenticatedRequest).auth;
  const searchQuery = (req.query.search as string) || "";
  const limit = parseInt((req.query.limit as string) || "100", 10);
  const category = (req.query.category as string) || "";
  const offset = parseInt((req.query.offset as string) || "0", 10);

  try {
    console.log(`Fetching trading pairs for connection: ${connectionId}, user: ${userId}, search: ${searchQuery}, category: ${category}, limit: ${limit}, offset: ${offset}`);

    const connection = await prisma.brokerCredential.findFirst({
      where: {
        id: connectionId,
        user_id: userId,
      },
    });

    if (!connection) {
      logger.warn(`Broker connection not found: ${connectionId} for user: ${userId}`);
      return res.status(404).json({ message: "Broker connection not found" });
    }

    console.log(`Found connection for broker: ${connection.broker_name}`);

    // Check if this is a Capital.com connection - if so, use our database instead of API
    if (connection.broker_name.toLowerCase() === "capital.com" || connection.broker_name.toLowerCase() === "capital_com") {
      logger.info("Using database for Capital.com pairs");

      let pairs;

      // If search query is provided, use search
      if (searchQuery) {
        pairs = await pairsCache.searchPairs(searchQuery);
      }
      // If category is provided, get by category
      else if (category) {
        // Map client category name to our database category name if needed
        const categoryMap: Record<string, string> = {
          WATCHLIST: "FOREX", // Default to FOREX for watchlist
          FOREX: "FOREX",
          CRYPTOCURRENCIES: "CRYPTOCURRENCIES",
          SHARES: "SHARES",
          INDICES: "INDICES",
          COMMODITIES: "COMMODITIES",
          ETF: "ETF",
        };

        const dbCategory = categoryMap[category.toUpperCase()] || category.toUpperCase();
        pairs = await pairsCache.getPairsByCategory(dbCategory);
      }
      // Otherwise, default to FOREX
      else {
        pairs = await pairsCache.getPairsByCategory("FOREX");
      }

      // Apply pagination
      const startIndex = offset;
      const endIndex = offset + limit;
      const paginatedPairs = pairs.slice(startIndex, endIndex);

      // Map to the format expected by the client
      const tradingPairs = paginatedPairs.map((pair) => ({
        symbol: pair.symbol,
        name: pair.displayName,
        displayName: pair.displayName,
        type: pair.type,
        minQuantity: parseFloat(pair.minQuantity?.toString() || "0.1"),
        maxQuantity: parseFloat(pair.maxQuantity?.toString() || "100"),
        precision: pair.precision || 2,
      }));

      logger.info(`Returning ${tradingPairs.length} Capital.com pairs from database`);
      return res.json(tradingPairs);
    }

    // For other brokers, continue with the existing implementation
    const BrokerAPI = brokerService.getBrokerAPI(connection.broker_name);
    if (!BrokerAPI) {
      logger.warn(`Unsupported broker: ${connection.broker_name}`);
      return res.status(400).json({ message: "Unsupported broker" });
    }

    try {
      console.log("Decrypting credentials...");
      const decryptedCredentials = brokerService.getDecryptedCredentials(connection);

      console.log("Initializing broker API...");
      const api = new BrokerAPI(decryptedCredentials.apiKey, decryptedCredentials.identifier, decryptedCredentials.password);

      console.log("Fetching instruments...");
      let instruments = await api.getInstruments();
      console.log(`Received ${instruments.length} instruments from broker API`);

      // Log some sample instrument types to help with debugging
      const instrumentTypes = new Set<string>();
      instruments.forEach((instrument: TradingPair) => {
        if (instrument.type) {
          instrumentTypes.add(instrument.type);
        }
      });
      console.log("Instrument types from Capital.com:", Array.from(instrumentTypes));

      // Filter by category if provided
      if (category) {
        console.log(`Filtering by category: ${category}`);

        // Define mappings from our category names to possible Capital.com instrument types
        const categoryMappings: Record<string, string[]> = {
          FOREX: ["CURRENCIES", "FX", "FOREX", "CURRENCY_PAIR", "CURRENCY"],
          CRYPTOCURRENCIES: ["CRYPTOCURRENCIES", "CRYPTOCURRENCY", "CRYPTO", "CRYPTO_PAIR"],
          SHARES: ["SHARES", "STOCKS", "OPT_SHARES", "SHARE", "STOCK"],
          INDICES: ["INDICES", "INDEX", "INDICE"],
          COMMODITIES: ["COMMODITIES", "COMMODITY", "OIL", "METALS", "METAL", "AGRICULTURAL"],
        };

        // Get possible types for the requested category
        const possibleTypes = categoryMappings[category.toUpperCase()] || [category.toUpperCase()];
        console.log(`Possible types for "${category}" category:`, possibleTypes);

        instruments = instruments.filter((instrument: TradingPair) => {
          // Case-insensitive matching for instrument type against all possible type names
          const instrumentType = instrument.type ? instrument.type.toUpperCase() : "";

          return possibleTypes.some((type) => instrumentType === type || instrumentType.includes(type) || type.includes(instrumentType));
        });
        console.log(`Filtered to ${instruments.length} instruments in category "${category}"`);
      }

      // Filter by search query if provided
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        instruments = instruments.filter(
          (instrument: TradingPair) =>
            instrument.symbol.toLowerCase().includes(query) ||
            instrument.name.toLowerCase().includes(query) ||
            (instrument.displayName && instrument.displayName.toLowerCase().includes(query))
        );
        console.log(`Filtered to ${instruments.length} instruments matching "${searchQuery}"`);
      }

      // Apply pagination with offset and limit
      const startIndex = offset;
      const endIndex = offset + limit;
      const paginatedInstruments = instruments.slice(startIndex, endIndex);

      console.log(`Applying pagination: offset=${offset}, limit=${limit}`);
      console.log(`Returning ${paginatedInstruments.length} instruments (${startIndex + 1}-${startIndex + paginatedInstruments.length} of ${instruments.length})`);

      return res.json(paginatedInstruments);
    } catch (error) {
      logger.error(`Error in API operations: ${error instanceof Error ? error.message : "Unknown error"}`);
      return res.status(500).json({ message: "Failed to fetch trading pairs from broker API", error: error instanceof Error ? error.message : "Unknown error" });
    }
  } catch (error) {
    logger.error("Error fetching trading pairs:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({ message: "Failed to fetch trading pairs" });
  }
});

export default router;
