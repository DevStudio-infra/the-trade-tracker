import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as dotenv from "dotenv";
import { chunk } from "lodash";

// Load environment variables
dotenv.config();

// Validate environment variables
const CAPITAL_API_KEY = process.env.CAPITAL_API_KEY;
const CAPITAL_IDENTIFIER = process.env.CAPITAL_IDENTIFIER;
const CAPITAL_PASSWORD = process.env.CAPITAL_PASSWORD;

// Check if required environment variables are set
if (!CAPITAL_API_KEY || !CAPITAL_IDENTIFIER || !CAPITAL_PASSWORD) {
  console.error("Missing required environment variables:");
  if (!CAPITAL_API_KEY) console.error("- CAPITAL_API_KEY is missing");
  if (!CAPITAL_IDENTIFIER) console.error("- CAPITAL_IDENTIFIER is missing");
  if (!CAPITAL_PASSWORD) console.error("- CAPITAL_PASSWORD is missing");

  console.error("Please check your .env file and ensure all required variables are set.");

  // If running as a script, exit with error
  if (require.main === module) {
    process.exit(1);
  }
}

const prisma = new PrismaClient();

// Market categories with their navigation node IDs and direct market nodes
const MARKET_CATEGORIES = {
  FOREX: {
    nodeId: "hierarchy_v1.forex",
    marketNodes: [
      "hierarchy_v1.currencies.most_traded",
      "hierarchy_v1.currencies.usd",
      "hierarchy_v1.currencies.eur",
      "hierarchy_v1.currencies.gbp",
      "hierarchy_v1.currencies.jpy",
    ],
  },
  CRYPTOCURRENCIES: {
    nodeId: "hierarchy_v1.crypto_currencies_group",
    marketNodes: ["hierarchy_v1.crypto_currencies"],
  },
  SHARES: {
    nodeId: "hierarchy_v1.shares",
    marketNodes: ["hierarchy_v1.shares.popular_shares"],
  },
  INDICES: {
    nodeId: "hierarchy_v1.indices_group",
    marketNodes: [
      "hierarchy_v1.indices",
      "hierarchy_v1.indices.popular_indices",
      "hierarchy_v1.indices.major_indices",
      "hierarchy_v1.indices.us",
      "hierarchy_v1.indices.europe",
      "hierarchy_v1.indices.asia",
    ],
  },
  COMMODITIES: {
    nodeId: "hierarchy_v1.commodities_group",
    marketNodes: [
      "hierarchy_v1.commodities.most_popular",
      "hierarchy_v1.commodities.metals",
      "hierarchy_v1.commodities.energy",
      "hierarchy_v1.commodities.agricultural",
      "hierarchy_v1.commodities.metal.gold", // Specific node for gold
      "hierarchy_v1.commodities.metal.silver", // Specific node for silver
      "hierarchy_v1.commodities.oil", // Specific node for oil
      "hierarchy_v1.commodities.energy.natural_gas", // Specific node for natural gas
    ],
  },
  ETF: {
    nodeId: "hierarchy_v1.etf_group",
    marketNodes: ["hierarchy_v1.etf_group.etf", "hierarchy_v1.etf_group.popular_etfs"],
  },
};

// Define important pairs that we need to ensure are included
const IMPORTANT_PAIRS = {
  COMMODITIES: [
    "XAUUSD", // Gold
    "XAGUSD", // Silver
    "OILUSD", // Crude Oil
    "NATGAS", // Natural Gas
    "GOLDPOUND", // Alternative gold pair
    "GOLDEUR", // Alternative gold pair
    "BRENT", // Alternative oil pair
    "CRUDE", // Alternative oil pair
    "WTI", // Alternative oil pair
  ],
  INDICES: [
    "SPX500", // S&P 500
    "JP225", // Nikkei 225
    "US500", // Alternative S&P 500
    "JPN225", // Alternative Nikkei 225
  ],
  ETF: [
    "QQQ", // Invesco QQQ Trust
  ],
};

// Define interfaces for API responses
interface MarketNode {
  id: string;
  name: string;
  [key: string]: any; // Allow for additional properties
}

interface MarketNavigationResponse {
  nodes: MarketNode[];
  [key: string]: any; // Allow for additional properties
}

// Define interfaces for market data
interface Market {
  epic: string;
  instrumentName: string;
  [key: string]: any;
}

interface MarketNavigationWithMarketsResponse {
  nodes?: MarketNode[];
  markets?: Market[];
  [key: string]: any;
}

// Create API client
const api = axios.create({
  baseURL: "https://demo-api-capital.backend-capital.com/api/v1", // Using demo API for testing
  headers: {
    "Content-Type": "application/json",
    "X-CAP-API-KEY": CAPITAL_API_KEY,
  },
});

// Define API base URL for direct calls
const API_BASE_URL = "https://demo-api-capital.backend-capital.com/api/v1";

// Session management
let sessionToken: string | null = null;

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to retry an operation with exponential backoff
async function retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, initialDelay = 1000, maxDelay = 10000): Promise<T> {
  let delay = initialDelay;
  let attempt = 0;

  while (true) {
    try {
      attempt++;
      return await operation();
    } catch (error) {
      if (attempt >= retries || !(axios.isAxiosError(error) && error.response?.status === 429)) {
        throw error;
      }

      console.log(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
      await wait(delay);

      // Exponential backoff with jitter
      delay = Math.min(delay * 2, maxDelay) * (0.8 + Math.random() * 0.4);
    }
  }
}

// Function to authenticate with Capital.com API
async function authenticate(): Promise<boolean> {
  console.log(`Authenticating with Capital.com API using identifier: ${CAPITAL_IDENTIFIER}`);
  console.log(`API Key being used: ${CAPITAL_API_KEY}`);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/session`,
      {
        identifier: CAPITAL_IDENTIFIER,
        password: CAPITAL_PASSWORD,
        encryptedPassword: false,
      },
      {
        headers: {
          "X-CAP-API-KEY": CAPITAL_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Authentication response received");

    // Log the response structure for debugging
    console.log("Response structure:", Object.keys(response.data));

    // The Capital.com API might not return a session object with a token
    // Instead, it might directly return account information
    // We'll check for the CST header which is required for authenticated requests

    // Log CST header if present
    const cst = response.headers["cst"];
    if (cst) {
      console.log("CST header received");
      api.defaults.headers.common["CST"] = cst;
    } else {
      console.error("No CST header in response - this is required for authenticated requests");
      throw new Error("No CST header in response");
    }

    // Check for X-SECURITY-TOKEN header
    const securityToken = response.headers["x-security-token"];
    if (securityToken) {
      console.log("X-SECURITY-TOKEN header received");
      api.defaults.headers.common["X-SECURITY-TOKEN"] = securityToken;
    } else {
      console.error("No X-SECURITY-TOKEN header in response - this is required for authenticated requests");
      throw new Error("No X-SECURITY-TOKEN header in response");
    }

    console.log("Authentication successful");
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Authentication failed with status:", error.response?.status);
      console.error("Error details:", error.response?.data);
    } else {
      console.error("Authentication failed:", error);
    }
    throw error;
  }
}

async function testApiConnection() {
  try {
    console.log("Testing API connection...");

    // Try to get a simple endpoint to test connectivity
    const response = await api.get("/session");
    console.log("API connection test successful:", {
      status: response.status,
      statusText: response.statusText,
    });
    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Check if it's a 401 error, which is expected for unauthenticated requests
      if (error.response?.status === 401) {
        console.log("API connection test successful (received expected 401 error)");
        return true;
      }

      // The error.null.client.token is also expected when testing connection
      if (error.response?.status === 400 && error.response?.data?.errorCode === "error.null.client.token") {
        console.log("API connection test successful (received expected error.null.client.token)");
        return true;
      }

      console.error("API connection test failed:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    } else {
      console.error("API connection test failed with unexpected error:", error);
    }

    throw new Error("Failed to connect to Capital.com API");
  }
}

// Update the getMarketNavigation function to use the new interface
async function getMarketNavigation(nodeId: string): Promise<MarketNavigationWithMarketsResponse> {
  try {
    console.log(`Fetching market navigation for node: ${nodeId}`);
    const response = await api.get(`/marketnavigation/${nodeId}`);

    if (!response.data) {
      console.warn(`No data found in market navigation response for ${nodeId}`);
      return { nodes: [], markets: [] };
    }

    console.log(`Successfully retrieved market navigation data for node ${nodeId}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Check for rate limit errors
      if (error.response?.status === 429) {
        console.error(`Rate limit exceeded when fetching market navigation for ${nodeId}. Consider adding a delay.`);
      } else {
        console.error(`Error fetching market navigation for ${nodeId}:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        });

        if (error.response?.data) {
          console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    } else {
      console.error(`Error fetching market navigation for ${nodeId}:`, error);
    }
    return { nodes: [], markets: [] }; // Return empty arrays to avoid breaking the flow
  }
}

// Update the getMarketDetails function to use the category parameter directly
async function getMarketDetails(epics: string, category: string): Promise<TradingPairData[]> {
  try {
    console.log(`Fetching market details for epics: ${epics}`);
    const response = await api.get(`/markets?epics=${epics}`);

    if (!response.data || !response.data.marketDetails) {
      console.warn(`No market details found in response for epics: ${epics}`);
      return [];
    }

    // Log the raw response for debugging
    console.log(`Raw market details response for first item:`, JSON.stringify(response.data.marketDetails[0] || {}, null, 2));

    // Map the response to our schema format
    const mappedPairs = response.data.marketDetails.map((marketDetail: any) => {
      // The instrument data is nested under the 'instrument' property
      const instrument = marketDetail.instrument || {};
      const dealingRules = marketDetail.dealingRules || {};
      const snapshot = marketDetail.snapshot || {};

      // Ensure numeric values are within field constraints (precision 10, scale 5)
      const minQuantity = dealingRules.minDealSize?.value ? parseFloat(dealingRules.minDealSize.value.toString()) : null;
      const maxQuantity = dealingRules.maxDealSize?.value ? parseFloat(dealingRules.maxDealSize.value.toString()) : null;

      // The field constraint means values must be less than 10^5 (100,000)
      const MAX_SAFE_VALUE = 99999.99999;

      return {
        symbol: instrument.epic || "",
        displayName: instrument.name || instrument.epic || "",
        type: instrument.type || "UNKNOWN",
        category, // Use the provided category directly
        minQuantity: minQuantity !== null ? Math.min(minQuantity, MAX_SAFE_VALUE) : null,
        maxQuantity: maxQuantity !== null ? Math.min(maxQuantity, MAX_SAFE_VALUE) : null,
        precision: snapshot.decimalPlacesFactor || null,
      };
    });

    console.log(`Successfully mapped ${mappedPairs.length} market details`);
    return mappedPairs;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Check for rate limit errors
      if (error.response?.status === 429) {
        console.error(`Rate limit exceeded when fetching market details. Consider adding a delay.`);
      } else {
        console.error(`API error when fetching market details:`, {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
        });
      }
    } else {
      console.error(`Error fetching market details:`, error);
    }
    return []; // Return empty array to avoid breaking the flow
  }
}

// Helper to determine category from market data
function getCategoryFromMarket(market: any): string {
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

async function populateCapitalPairs() {
  console.log("Starting Capital.com pairs population...");

  // Test API connection first
  try {
    await testApiConnection();
    console.log("API connection test successful");
  } catch (error) {
    console.error("Failed to connect to Capital.com API. Exiting.");
    return;
  }

  // Authenticate
  try {
    const authenticated = await authenticate();
    if (!authenticated) {
      console.error("Authentication returned false. Exiting.");
      return;
    }
    console.log("Authentication successful");
  } catch (error) {
    console.error("Failed to authenticate. Exiting.");
    return;
  }

  // Process each category
  for (const [category, config] of Object.entries(MARKET_CATEGORIES)) {
    console.log(`Processing category: ${category}`);

    try {
      // Process each market node for this category
      for (const marketNodeId of config.marketNodes) {
        console.log(`Processing market node: ${marketNodeId}`);

        try {
          // Get markets directly from this node
          const markets = await retryWithBackoff(() => getMarketNavigation(marketNodeId));

          if (!markets.markets || markets.markets.length === 0) {
            console.log(`No markets found for ${marketNodeId}, skipping`);
            continue;
          }

          console.log(`Found ${markets.markets.length} markets in ${marketNodeId}`);

          // Extract epics from markets
          const epics = markets.markets.map((market: Market) => market.epic);
          const batches = chunk(epics, 10); // Process 10 instruments at a time

          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`Processing batch ${i + 1}/${batches.length} for ${category}`);

            const epicString = batch.join(",");

            // Get market details with retry, passing the category
            const pairs = await retryWithBackoff(() => getMarketDetails(epicString, category));

            console.log(`Storing ${pairs.length} pairs for ${category}`);

            // Store in database using Prisma - one pair at a time to handle errors
            if (pairs.length > 0) {
              let successCount = 0;

              for (const pair of pairs) {
                try {
                  // Skip pairs with empty symbols
                  if (!pair.symbol || pair.symbol.trim() === "") {
                    console.warn(`Skipping pair with empty symbol: ${JSON.stringify(pair)}`);
                    continue;
                  }

                  // Use upsert to handle duplicates - updates existing or creates new
                  await prisma.capitalComPair.upsert({
                    where: { symbol: pair.symbol },
                    update: {
                      displayName: pair.displayName || "",
                      type: pair.type || "UNKNOWN",
                      category: pair.category,
                      minQuantity: pair.minQuantity,
                      maxQuantity: pair.maxQuantity,
                      precision: pair.precision,
                      isActive: true,
                    },
                    create: {
                      symbol: pair.symbol,
                      displayName: pair.displayName || "",
                      type: pair.type || "UNKNOWN",
                      category: pair.category,
                      minQuantity: pair.minQuantity,
                      maxQuantity: pair.maxQuantity,
                      precision: pair.precision,
                      isActive: true,
                    },
                  });
                  successCount++;
                } catch (error) {
                  console.error(`Error inserting pair ${pair.symbol}:`, error);
                }
              }

              console.log(`Successfully stored ${successCount}/${pairs.length} pairs for ${category}`);
            }

            // Add a small delay between batches to avoid rate limits
            if (i < batches.length - 1) {
              console.log("Waiting 500ms before next batch...");
              await wait(500);
            }
          }
        } catch (error) {
          console.error(`Error processing market node ${marketNodeId}:`, error);
        }
      }

      console.log(`Completed processing for ${category}`);
    } catch (error) {
      console.error(`Error processing category ${category}:`, error);
    }
  }

  // Now specifically try to add important missing pairs
  console.log("\n=== Checking for important pairs ===");

  for (const [category, symbols] of Object.entries(IMPORTANT_PAIRS)) {
    console.log(`Looking for important ${category} pairs...`);

    // Check which pairs are missing
    const existingPairs = await prisma.capitalComPair.findMany({
      where: {
        symbol: { in: symbols },
        category: category,
      },
      select: { symbol: true },
    });

    const existingSymbols = existingPairs.map((p) => p.symbol);
    const missingSymbols = symbols.filter((s) => !existingSymbols.includes(s));

    if (missingSymbols.length === 0) {
      console.log(`All important ${category} pairs are already in the database`);
      continue;
    }

    console.log(`Missing important ${category} pairs: ${missingSymbols.join(", ")}`);

    // Try to fetch the missing pairs directly
    for (const symbol of missingSymbols) {
      try {
        console.log(`Trying to fetch important pair: ${symbol}`);

        // Try direct market details endpoint
        const pairs = await retryWithBackoff(() => getMarketDetails(symbol, category));

        if (pairs.length > 0) {
          console.log(`Successfully fetched ${symbol}`);

          // Insert into database
          await prisma.capitalComPair.upsert({
            where: { symbol: symbol },
            update: {
              displayName: pairs[0].displayName || symbol,
              type: pairs[0].type || category,
              category: category,
              minQuantity: pairs[0].minQuantity || 0.01,
              maxQuantity: pairs[0].maxQuantity || 1000,
              precision: pairs[0].precision || 2,
              isActive: true,
            },
            create: {
              symbol: symbol,
              displayName: pairs[0].displayName || symbol,
              type: pairs[0].type || category,
              category: category,
              minQuantity: pairs[0].minQuantity || 0.01,
              maxQuantity: pairs[0].maxQuantity || 1000,
              precision: pairs[0].precision || 2,
              isActive: true,
            },
          });

          console.log(`Stored important pair: ${symbol}`);
        } else {
          console.log(`Could not fetch details for ${symbol}, will create a placeholder entry`);

          // Create a placeholder entry for the important pair
          await prisma.capitalComPair.upsert({
            where: { symbol: symbol },
            update: {
              displayName: getDefaultDisplayName(symbol),
              type: category,
              category: category,
              minQuantity: 0.01,
              maxQuantity: 1000,
              precision: 2,
              isActive: true,
            },
            create: {
              symbol: symbol,
              displayName: getDefaultDisplayName(symbol),
              type: category,
              category: category,
              minQuantity: 0.01,
              maxQuantity: 1000,
              precision: 2,
              isActive: true,
            },
          });

          console.log(`Created placeholder for important pair: ${symbol}`);
        }
      } catch (error) {
        console.error(`Error processing important pair ${symbol}:`, error);
      }

      // Brief wait to avoid rate limits
      await wait(300);
    }
  }

  console.log("Capital.com pairs population completed");
}

// Helper function to generate a display name for placeholder entries
function getDefaultDisplayName(symbol: string): string {
  if (symbol === "XAUUSD") return "Gold / USD";
  if (symbol === "XAGUSD") return "Silver / USD";
  if (symbol === "OILUSD") return "Crude Oil / USD";
  if (symbol === "NATGAS") return "Natural Gas";
  if (symbol === "SPX500") return "S&P 500";
  if (symbol === "JP225") return "Nikkei 225";
  if (symbol === "QQQ") return "Invesco QQQ Trust";
  if (symbol === "GOLDPOUND") return "Gold / GBP";
  if (symbol === "GOLDEUR") return "Gold / EUR";
  if (symbol === "BRENT") return "Brent Crude Oil";
  if (symbol === "CRUDE") return "Crude Oil";
  if (symbol === "WTI") return "WTI Crude Oil";
  if (symbol === "US500") return "S&P 500";
  if (symbol === "JPN225") return "Nikkei 225";

  // Default formatting for unknown symbols
  return symbol.replace(/([A-Z]{3})([A-Z]{3})/, "$1 / $2");
}

// Function to explore market navigation structure
async function exploreMarketNavigation(nodeId: string = "") {
  try {
    console.log(`Exploring market navigation${nodeId ? ` for node: ${nodeId}` : " (root)"}`);
    const endpoint = nodeId ? `/marketnavigation/${nodeId}` : "/marketnavigation";

    const response = await api.get(endpoint);

    if (!response.data) {
      console.warn("No data found in market navigation response");
      return;
    }

    // Log the structure of the response
    console.log("Market navigation response structure:", Object.keys(response.data));

    // Check for nodes
    if (response.data.nodes && response.data.nodes.length > 0) {
      console.log(`Found ${response.data.nodes.length} nodes:`);

      // Log each node
      response.data.nodes.forEach((node: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${node.id}, Name: ${node.name}`);
      });
    } else {
      console.log("No nodes found");
    }

    // Check for markets
    if (response.data.markets && response.data.markets.length > 0) {
      console.log(`Found ${response.data.markets.length} markets:`);

      // Log the first few markets
      response.data.markets.slice(0, 5).forEach((market: any, index: number) => {
        console.log(`  ${index + 1}. Epic: ${market.epic}, Name: ${market.instrumentName}`);
      });

      if (response.data.markets.length > 5) {
        console.log(`  ... and ${response.data.markets.length - 5} more markets`);
      }
    } else {
      console.log("No markets found");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error exploring market navigation:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });

      if (error.response?.data) {
        console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      }
    } else {
      console.error("Error exploring market navigation:", error);
    }
  }
}

// Function to recursively explore market navigation structure
async function exploreMarketNavigationRecursive(nodeId: string = "", depth: number = 0, maxDepth: number = 3) {
  if (depth > maxDepth) {
    console.log(`  ${"  ".repeat(depth)}Reached max depth (${maxDepth}), stopping exploration`);
    return;
  }

  try {
    console.log(`  ${"  ".repeat(depth)}Exploring market navigation${nodeId ? ` for node: ${nodeId}` : " (root)"}`);
    const endpoint = nodeId ? `/marketnavigation/${nodeId}` : "/marketnavigation";

    const response = await api.get(endpoint);

    if (!response.data) {
      console.log(`  ${"  ".repeat(depth)}No data found in market navigation response`);
      return;
    }

    // Check for nodes
    if (response.data.nodes && response.data.nodes.length > 0) {
      console.log(`  ${"  ".repeat(depth)}Found ${response.data.nodes.length} nodes:`);

      // Log each node
      for (const node of response.data.nodes) {
        console.log(`  ${"  ".repeat(depth + 1)}ID: ${node.id}, Name: ${node.name}`);

        // Recursively explore this node
        await exploreMarketNavigationRecursive(node.id, depth + 1, maxDepth);
      }
    } else {
      console.log(`  ${"  ".repeat(depth)}No nodes found`);
    }

    // Check for markets
    if (response.data.markets && response.data.markets.length > 0) {
      console.log(`  ${"  ".repeat(depth)}Found ${response.data.markets.length} markets:`);

      // Log the first few markets
      response.data.markets.slice(0, 5).forEach((market: Market, index: number) => {
        console.log(`  ${"  ".repeat(depth + 1)}Epic: ${market.epic}, Name: ${market.instrumentName}`);
      });

      if (response.data.markets.length > 5) {
        console.log(`  ${"  ".repeat(depth + 1)}... and ${response.data.markets.length - 5} more markets`);
      }
    } else {
      console.log(`  ${"  ".repeat(depth)}No markets found`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`  ${"  ".repeat(depth)}Error exploring market navigation:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
      });
    } else {
      console.error(`  ${"  ".repeat(depth)}Error exploring market navigation:`, error);
    }
  }
}

// Define interface for the pair data
interface TradingPairData {
  symbol: string;
  displayName: string;
  type: string;
  category: string;
  minQuantity: number | null;
  maxQuantity: number | null;
  precision: number | null;
}

// Run the script
if (require.main === module) {
  populateCapitalPairs()
    .catch((e) => {
      console.error("Error in population script:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      console.log("Disconnected from database");
    });
} else {
  // Export for use in other modules
  module.exports = { populateCapitalPairs };
}
