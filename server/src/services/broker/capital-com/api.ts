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
      } else {
        throw new Error("Authentication failed: Missing security tokens");
      }
    } catch (error) {
      logger.error({
        message: "Authentication failed",
        error: error instanceof Error ? error.message : "Unknown error",
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
}
