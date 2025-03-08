import axios from "axios";
import { createLogger } from "../../../utils/logger";

const logger = createLogger("capital-com-api");

export class CapitalComAPI {
  private readonly baseUrl = "https://api-capital.backend-capital.com/api/v1";
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private getHeaders() {
    return {
      "X-CAP-API-KEY": this.apiKey,
      "X-CAP-API-SECRET": this.apiSecret,
      "Content-Type": "application/json",
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/session`, {
        headers: this.getHeaders(),
      });

      return response.status === 200;
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
}
