import axios from "axios";
import { createLogger } from "../../../utils/logger";

const logger = createLogger("capital-com-api");

export class CapitalComAPI {
  private readonly baseUrl = "https://demo-api-capital.backend-capital.com/api/v1";
  private readonly apiKey: string;
  private readonly identifier: string;
  private readonly password: string;
  private securityToken: string | null = null;
  private cst: string | null = null;

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

  async authenticate(): Promise<void> {
    try {
      console.log("Authenticating with Capital.com API...");
      const response = await axios.post(
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
      );

      if (response.headers["cst"] && response.headers["x-security-token"]) {
        this.cst = response.headers["cst"];
        this.securityToken = response.headers["x-security-token"];
        console.log("Authentication successful");
      } else {
        throw new Error("Authentication failed: Missing security tokens");
      }
    } catch (error) {
      console.error("Authentication failed:", error instanceof Error ? error.message : "Unknown error");
      logger.error({
        message: "Authentication failed",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
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
