import axios from "axios";
import { createLogger } from "../../../utils/logger";
import { sleep } from "../../../utils/common";

const logger = createLogger("capital-com-api");

// Constants for rate limiting
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class CapitalComAPI {
  private readonly baseUrl = "https://demo-api-capital.backend-capital.com/api/v1";
  private readonly apiKey: string;
  private readonly identifier: string;
  private readonly password: string;
  private securityToken: string | null = null;
  private cst: string | null = null;
  private lastRequestTime = 0;
  private minRequestInterval = 250; // 250ms between requests to avoid rate limits

  constructor(apiKey: string, identifier: string, password: string) {
    this.apiKey = apiKey;
    this.identifier = identifier;
    this.password = password;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      "X-CAP-API-KEY": this.apiKey,
      "Content-Type": "application/json",
    };

    if (this.securityToken && this.cst) {
      headers["X-SECURITY-TOKEN"] = this.securityToken;
      headers["CST"] = this.cst;
    }

    return headers;
  }

  // Add rate limiting to prevent 429 errors
  private async throttledRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeElapsed = now - this.lastRequestTime;

    if (timeElapsed < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeElapsed;
      logger.debug(`Throttling request, waiting ${waitTime}ms`);
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    return requestFn();
  }

  async authenticate(): Promise<void> {
    try {
      logger.info("Authenticating with Capital.com API...");
      const response = await this.throttledRequest(() =>
        axios.post(
          `${this.baseUrl}/session`,
          {
            identifier: this.identifier,
            password: this.password,
          },
          {
            headers: {
              "X-CAP-API-KEY": this.apiKey,
              "Content-Type": "application/json",
            },
          }
        )
      );

      if (response.headers["cst"] && response.headers["x-security-token"]) {
        this.cst = response.headers["cst"];
        this.securityToken = response.headers["x-security-token"];
        logger.info("Authentication successful");
      } else {
        throw new Error("Authentication failed: Missing security tokens");
      }
    } catch (error) {
      logger.error({
        message: "Authentication failed",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // Helper function to convert timeframe to Capital.com format
  private convertTimeframe(timeframe: string): string {
    const conversions: { [key: string]: string } = {
      "1m": "MINUTE",
      "5m": "MINUTE_5",
      "15m": "MINUTE_15",
      "30m": "MINUTE_30",
      "1h": "HOUR",
      "1H": "HOUR",
      "4h": "HOUR_4",
      "4H": "HOUR_4",
      "1d": "DAY",
      "1D": "DAY",
      "1w": "WEEK",
      "1W": "WEEK",
      "1M": "MONTH",
    };

    return conversions[timeframe] || "HOUR"; // Default to 1 hour if not found
  }

  // Implement getCandles with retry logic
  async getCandles(symbol: string, timeframe: string, limit = 200): Promise<any[]> {
    // Ensure we're authenticated
    if (!this.securityToken || !this.cst) {
      await this.authenticate();
    }

    let retries = 0;
    let backoffDelay = INITIAL_RETRY_DELAY;

    while (retries <= MAX_RETRIES) {
      try {
        logger.info(`Fetching candles for ${symbol} (${timeframe}), attempt ${retries + 1}`);

        // Convert timeframe to Capital.com format
        const resolution = this.convertTimeframe(timeframe);

        const response = await this.throttledRequest(() =>
          axios.get(`${this.baseUrl}/prices/${symbol}`, {
            params: {
              resolution,
              max: limit,
            },
            headers: this.getHeaders(),
          })
        );

        // Add detailed logging of the response structure
        logger.debug({
          message: "Raw response data",
          dataType: typeof response.data,
          hasData: response.data !== null && response.data !== undefined,
          dataKeys: response.data ? Object.keys(response.data) : [],
          hasPrices: response.data?.prices !== undefined,
          pricesType: response.data?.prices ? typeof response.data.prices : "N/A",
          pricesLength: Array.isArray(response.data?.prices) ? response.data.prices.length : "not an array",
          samplePrice: Array.isArray(response.data?.prices) && response.data.prices.length > 0 ? JSON.stringify(response.data.prices[0]).substring(0, 500) : "no sample available",
        });

        if (!response.data?.prices) {
          logger.error({
            message: "Invalid price data response",
            data: typeof response.data === "object" ? JSON.stringify(response.data).substring(0, 1000) : response.data,
          });
          throw new Error("Invalid price data response");
        }

        try {
          const candles = response.data.prices.map((price: any) => {
            try {
              // Detailed logging for first few items to debug parsing
              if (Array.isArray(response.data?.prices) && response.data.prices.indexOf(price) < 3) {
                logger.debug({
                  message: "Processing price item",
                  priceItem: JSON.stringify(price),
                  snapshotTime: price.snapshotTime,
                  parsedTime: new Date(price.snapshotTime).getTime(),
                  openPrice: price.openPrice?.bid,
                  highPrice: price.highPrice?.bid,
                  lowPrice: price.lowPrice?.bid,
                  closePrice: price.closePrice?.bid,
                  volume: price.lastTradedVolume || 0,
                });
              }

              return {
                timestamp: new Date(price.snapshotTime).getTime(),
                open: parseFloat(price.openPrice.bid),
                high: parseFloat(price.highPrice.bid),
                low: parseFloat(price.lowPrice.bid),
                close: parseFloat(price.closePrice.bid),
                volume: parseFloat(price.lastTradedVolume || 0),
              };
            } catch (parseError) {
              logger.error({
                message: "Error parsing individual price item",
                error: parseError instanceof Error ? parseError.message : "Unknown error",
                priceItem: typeof price === "object" ? JSON.stringify(price).substring(0, 500) : price,
              });
              throw parseError;
            }
          });

          logger.info(`Successfully fetched ${candles.length} candles for ${symbol} (${timeframe})`);
          return candles;
        } catch (parseError) {
          logger.error({
            message: "Error parsing price data",
            error: parseError instanceof Error ? parseError.message : "Unknown error",
            symbol,
            timeframe,
          });
          throw new Error(`Error parsing price data: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
        }
      } catch (error: any) {
        retries++;

        // Handle rate limit errors with exponential backoff
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          // Exponential backoff: double the delay for each retry
          logger.warn(`Rate limit exceeded (429). Retrying in ${backoffDelay}ms. Attempt ${retries} of ${MAX_RETRIES}`);

          // Get retry-after header if available
          const retryAfter = error.response.headers["retry-after"];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoffDelay;

          await sleep(waitTime);
          backoffDelay *= 2;

          // If we hit a rate limit, increase the min request interval for future requests
          this.minRequestInterval = Math.min(this.minRequestInterval * 1.5, 2000);

          // Try to re-authenticate in case our token expired
          if (retries > 1) {
            try {
              await this.authenticate();
            } catch (authError) {
              logger.error("Failed to re-authenticate during retry");
            }
          }

          continue;
        }

        // Log the error and rethrow
        logger.error({
          message: `Failed to fetch candles (attempt ${retries})`,
          error: error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
          symbol,
          timeframe,
          isAxiosError: axios.isAxiosError(error),
          responseStatus: axios.isAxiosError(error) ? error.response?.status : undefined,
          responseData: axios.isAxiosError(error)
            ? typeof error.response?.data === "object"
              ? JSON.stringify(error.response?.data).substring(0, 1000)
              : error.response?.data
            : undefined,
        });

        if (retries < MAX_RETRIES) {
          await sleep(backoffDelay);
          backoffDelay *= 2;
          continue;
        }

        throw new Error(`Failed to fetch candles after ${MAX_RETRIES} attempts: ${error.message}`);
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new Error(`Failed to fetch candles after ${MAX_RETRIES} attempts`);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.authenticate();
      return true;
    } catch (error) {
      logger.error({
        message: "API key validation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return false;
    }
  }

  async getAccountInfo() {
    try {
      if (!this.securityToken) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/accounts`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      logger.error({
        message: "Error fetching account info",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getPositions() {
    try {
      if (!this.securityToken) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.baseUrl}/positions`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      logger.error({
        message: "Error fetching positions",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async createPosition(params: { epic: string; direction: "BUY" | "SELL"; size: number; stopLevel?: number; profitLevel?: number }) {
    try {
      if (!this.securityToken) {
        await this.authenticate();
      }

      const response = await axios.post(`${this.baseUrl}/positions`, params, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      logger.error({
        message: "Error creating position",
        error: error instanceof Error ? error.message : "Unknown error",
        params,
      });
      throw error;
    }
  }

  async closePosition(dealId: string) {
    try {
      if (!this.securityToken) {
        await this.authenticate();
      }

      const response = await axios.delete(`${this.baseUrl}/positions/${dealId}`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      logger.error({
        message: "Error closing position",
        error: error instanceof Error ? error.message : "Unknown error",
        dealId,
      });
      throw error;
    }
  }

  async getInstruments() {
    try {
      console.log("Getting instruments from Capital.com API...");
      // Always authenticate for getInstruments, as tokens might be expired
      await this.authenticate();

      console.log("Making API call to fetch markets...");
      const response = await axios.get(`${this.baseUrl}/markets`, {
        headers: this.getHeaders(),
      });

      console.log(`Received ${response.data.markets?.length || 0} markets from Capital.com`);

      // Handle empty response
      if (!response.data.markets || !Array.isArray(response.data.markets)) {
        console.warn("No markets data found in API response");
        return [];
      }

      // Log the first few markets for debugging
      if (response.data.markets.length > 0) {
        console.log("Sample market data:", {
          first: response.data.markets[0],
          instrumentTypes: new Set(response.data.markets.slice(0, 100).map((m: any) => m.instrumentType)),
        });
      }

      const instruments = response.data.markets.map((market: any) => ({
        symbol: market.epic,
        name: market.instrumentName,
        displayName: `${market.instrumentName} (${market.epic})`,
        type: market.instrumentType || "", // Explicitly handle undefined
        minQuantity: market.minDealSize || 0.1,
        maxQuantity: market.maxDealSize || 100,
        precision: market.decimalPlaces || 2,
      }));

      // Count instruments by type
      const typeCount: Record<string, number> = {};
      instruments.forEach((instrument: any) => {
        const type = instrument.type || "UNKNOWN";
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      console.log("Instruments by type:", typeCount);

      return instruments;
    } catch (error: unknown) {
      console.error("Error fetching instruments:", error instanceof Error ? error.message : "Unknown error");
      // Prevent circular JSON structure in logging
      logger.error({
        message: "Error fetching instruments",
        error: error instanceof Error ? error.message : "Unknown error",
        status: error instanceof Error && "response" in error ? (error as any).response?.status : undefined,
        statusText: error instanceof Error && "response" in error ? (error as any).response?.statusText : undefined,
        data: error instanceof Error && "response" in error ? JSON.stringify((error as any).response?.data) : undefined,
      });

      // Return empty array instead of throwing
      return [];
    }
  }
}
