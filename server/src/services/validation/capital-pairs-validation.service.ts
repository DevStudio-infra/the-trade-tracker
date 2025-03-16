import { PrismaClient } from "@prisma/client";
import axios from "axios";
import { chunk } from "lodash";
import { createLogger } from "../../utils/logger";
import { PairsCacheService } from "../cache/pairs-cache.service";

const logger = createLogger("capital-pairs-validation");

// Market categories with their navigation node IDs
const MARKET_CATEGORIES = {
  FOREX: "hierarchy_v1.forex_group",
  CRYPTOCURRENCIES: "hierarchy_v1.crypto_group",
  SHARES: "hierarchy_v1.shares_group",
  INDICES: "hierarchy_v1.indices_group",
  COMMODITIES: "hierarchy_v1.commodities_group",
};

export class CapitalPairsValidationService {
  private readonly prisma: PrismaClient;
  private readonly cacheService: PairsCacheService;
  private api: any;
  private sessionToken: string | null = null;

  constructor(prisma: PrismaClient, cacheService: PairsCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;

    // Initialize API client
    this.api = axios.create({
      baseURL: "https://api-capital.backend-capital.com/api/v1",
      headers: {
        "Content-Type": "application/json",
        "X-CAP-API-KEY": process.env.CAPITAL_API_KEY,
      },
    });
  }

  /**
   * Authenticate with Capital.com API
   */
  private async authenticate(): Promise<boolean> {
    try {
      logger.info("Authenticating with Capital.com API...");
      const response = await this.api.post("/session", {
        identifier: process.env.CAPITAL_IDENTIFIER,
        password: process.env.CAPITAL_PASSWORD,
      });

      this.sessionToken = response.data.session.token;
      this.api.defaults.headers.common["X-SECURITY-TOKEN"] = this.sessionToken;

      logger.info("Authentication successful");
      return true;
    } catch (error) {
      logger.error("Authentication failed:", error);
      return false;
    }
  }

  /**
   * Get market navigation data
   */
  private async getMarketNavigation(nodeId: string) {
    try {
      const response = await this.api.get(`/marketnavigation/${nodeId}`);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching market navigation for ${nodeId}:`, error);
      throw error;
    }
  }

  /**
   * Get market details
   */
  private async getMarketDetails(epics: string) {
    try {
      const response = await this.api.get(`/markets?epics=${epics}`);

      // Map the response to our schema format
      return response.data.marketDetails.map((market: any) => ({
        symbol: market.epic,
        displayName: market.instrumentName,
        type: market.instrumentType,
        category: this.getCategoryFromMarket(market),
        minQuantity: market.minDealSize || null,
        maxQuantity: market.maxDealSize || null,
        precision: market.decimalPlacesFactor || null,
      }));
    } catch (error) {
      logger.error(`Error fetching market details:`, error);
      throw error;
    }
  }

  /**
   * Helper to determine category from market data
   */
  private getCategoryFromMarket(market: any): string {
    const type = market.instrumentType?.toUpperCase();
    const symbol = market.epic?.toUpperCase();

    // Common currency codes for major and minor forex pairs
    const commonCurrencies = ["EUR", "USD", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];

    // Check for standard forex pair patterns
    if (
      type === "CURRENCIES" ||
      type === "FOREX" ||
      type === "FX" ||
      type === "CURRENCY_PAIR" ||
      (symbol.length === 6 && commonCurrencies.some((curr) => symbol.startsWith(curr)) && commonCurrencies.some((curr) => symbol.endsWith(curr)))
    ) {
      return "FOREX";
    }

    // Check for crypto patterns
    const cryptoTokens = ["BTC", "ETH", "USDT", "BNB", "XRP", "ADA", "DOT", "DOGE"];
    if (type === "CRYPTOCURRENCIES" || type === "CRYPTOCURRENCY" || cryptoTokens.some((token) => symbol.includes(token))) {
      return "CRYPTOCURRENCIES";
    }

    // Check for stock patterns
    if (type === "SHARES" || type === "STOCKS" || type === "EQUITIES" || symbol.includes(".US") || symbol.includes(".UK")) {
      return "SHARES";
    }

    // Check for indices patterns
    if (type === "INDICES" || type === "INDEX" || symbol.includes("US30") || symbol.includes("US500") || symbol.includes("UK100")) {
      return "INDICES";
    }

    // Check for commodities patterns
    if (type === "COMMODITIES" || type === "COMMODITY" || symbol.includes("OIL") || symbol.includes("GOLD") || symbol.includes("SILVER")) {
      return "COMMODITIES";
    }

    // Default to the original type if we can't determine
    return type || "UNKNOWN";
  }

  /**
   * Validate all pairs across all categories
   */
  async validatePairs(): Promise<void> {
    logger.info("Starting monthly validation of Capital.com pairs");

    // Authenticate first
    const authenticated = await this.authenticate();
    if (!authenticated) {
      logger.error("Failed to authenticate. Exiting validation.");
      return;
    }

    // Process each category
    for (const [category, nodeId] of Object.entries(MARKET_CATEGORIES)) {
      await this.validateCategory(category, nodeId);
    }

    logger.info("Monthly validation completed");
  }

  /**
   * Validate pairs for a specific category
   */
  async validateCategory(category: string, nodeId: string): Promise<void> {
    logger.info(`Validating pairs for category: ${category}`);

    try {
      // Get market navigation data
      const markets = await this.getMarketNavigation(nodeId);
      logger.info(`Found ${markets.nodes?.length || 0} markets in ${category}`);

      if (!markets.nodes || markets.nodes.length === 0) {
        logger.warn(`No markets found for ${category}, skipping`);
        return;
      }

      // Get market details in batches to avoid rate limits
      const epics = markets.nodes.map((node: any) => node.id);
      const batches = chunk(epics, 10); // Process 10 instruments at a time

      let updatedCount = 0;
      let newCount = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.debug(`Processing batch ${i + 1}/${batches.length} for ${category}`);

        const epicString = batch.join(",");
        const pairs = await this.getMarketDetails(epicString);

        // Update using Prisma transactions
        await this.prisma.$transaction(async (tx) => {
          for (const pair of pairs) {
            // Check if pair exists
            const existingPair = await tx.capitalComPair.findUnique({
              where: { symbol: pair.symbol },
            });

            if (existingPair) {
              // Update existing pair
              await tx.capitalComPair.update({
                where: { symbol: pair.symbol },
                data: {
                  displayName: pair.displayName,
                  type: pair.type,
                  category: pair.category,
                  minQuantity: pair.minQuantity,
                  maxQuantity: pair.maxQuantity,
                  precision: pair.precision,
                  isActive: true,
                  lastUpdated: new Date(),
                },
              });
              updatedCount++;
            } else {
              // Create new pair
              await tx.capitalComPair.create({
                data: {
                  symbol: pair.symbol,
                  displayName: pair.displayName,
                  type: pair.type,
                  category: pair.category,
                  minQuantity: pair.minQuantity,
                  maxQuantity: pair.maxQuantity,
                  precision: pair.precision,
                },
              });
              newCount++;
            }
          }
        });

        // Add a small delay between batches to avoid rate limits
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      logger.info(`Validation results for ${category}: ${newCount} new pairs, ${updatedCount} updated pairs`);

      // Refresh cache after update
      await this.cacheService.refreshCategory(category);
    } catch (error) {
      logger.error(`Error validating category ${category}:`, error);
    }
  }
}
