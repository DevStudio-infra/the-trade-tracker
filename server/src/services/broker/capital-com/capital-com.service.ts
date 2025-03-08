import axios from "axios";

interface CapitalComConfig {
  apiKey: string;
  identifier: string;
  password: string;
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class CapitalComService {
  private readonly baseUrl = "https://api-capital.backend-capital.com/api/v1";
  private sessionToken: string | null = null;
  private cst: string | null = null;
  private readonly config: CapitalComConfig;

  constructor(config: CapitalComConfig) {
    this.config = config;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.sessionToken && this.cst) return;

    try {
      console.log("Attempting authentication with Capital.com...");
      console.log("Using identifier:", this.config.identifier);
      console.log("API Key length:", this.config.apiKey.length);

      const response = await axios.post(
        `${this.baseUrl}/session`,
        {
          identifier: this.config.identifier,
          password: this.config.password,
          encryptedPassword: false,
        },
        {
          headers: {
            "X-CAP-API-KEY": this.config.apiKey,
          },
        }
      );

      console.log("Authentication response:", JSON.stringify(response.data, null, 2));
      console.log("Response headers:", response.headers);

      const token = response.headers["x-security-token"];
      const cst = response.headers["cst"];

      if (!token) {
        console.error("Missing X-SECURITY-TOKEN header in response");
        throw new Error("Invalid authentication response: missing security token");
      }

      if (!cst) {
        console.error("Missing CST header in response");
        throw new Error("Invalid authentication response: missing CST");
      }

      this.sessionToken = token;
      this.cst = cst;

      console.log("Successfully authenticated with Capital.com");
      console.log("Session token length:", token.length);
      console.log("CST length:", cst.length);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Authentication request failed:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      } else {
        console.error("Authentication error:", error);
      }
      throw new Error("Failed to authenticate with Capital.com");
    }
  }

  async getCandles(pair: string, timeframe: string, count: number): Promise<Candle[]> {
    await this.ensureAuthenticated();

    if (!this.sessionToken || !this.cst) {
      throw new Error("Not authenticated");
    }

    try {
      console.log(`Fetching candles for ${pair} (${timeframe})...`);

      // Convert timeframe to Capital.com format
      const resolution = this.convertTimeframe(timeframe);
      console.log("Using resolution:", resolution);

      const response = await axios.get(`${this.baseUrl}/prices/${pair}`, {
        params: {
          resolution,
          max: count,
          // Additional parameters as needed
        },
        headers: {
          "X-SECURITY-TOKEN": this.sessionToken,
          CST: this.cst,
        },
      });

      if (!response.data?.prices) {
        console.error("Invalid price data response:", response.data);
        throw new Error("Invalid price data response");
      }

      const candles = response.data.prices.map((price: any) => ({
        timestamp: new Date(price.snapshotTime).getTime(),
        open: parseFloat(price.openPrice.bid),
        high: parseFloat(price.highPrice.bid),
        low: parseFloat(price.lowPrice.bid),
        close: parseFloat(price.closePrice.bid),
        volume: parseFloat(price.lastTradedVolume),
      }));

      console.log(`Successfully fetched ${candles.length} candles`);
      return candles;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Failed to fetch candles:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      } else {
        console.error("Failed to fetch candles:", error);
      }
      throw new Error("Failed to fetch candles from Capital.com");
    }
  }

  private convertTimeframe(timeframe: string): string {
    const conversions: { [key: string]: string } = {
      "1m": "MINUTE",
      "5m": "MINUTE_5",
      "15m": "MINUTE_15",
      "30m": "MINUTE_30",
      "1H": "HOUR",
      "4H": "HOUR_4",
      "1D": "DAY",
      "1W": "WEEK",
    };

    return conversions[timeframe] || "HOUR";
  }
}
