import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { CapitalRateLimiter } from "../../src/services/broker/capital-com/rate-limiter.service";

describe("CapitalRateLimiter", () => {
  let limiter: CapitalRateLimiter;

  beforeEach(() => {
    limiter = new CapitalRateLimiter();
  });

  afterEach(() => {
    limiter.destroy();
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limits", async () => {
      // Test market data rate limit (10 requests per second)
      for (let i = 0; i < 10; i++) {
        await expect(limiter.checkRateLimit("market_data")).resolves.not.toThrow();
      }
    });

    it("should enforce rate limits", async () => {
      // Make 11 requests (1 over limit) in quick succession
      const promises = Array(11)
        .fill(0)
        .map(() => limiter.checkRateLimit("market_data"));

      // The 11th request should take longer due to rate limiting
      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      // Should have waited at least 1 second for the rate limit window to reset
      expect(duration).toBeGreaterThanOrEqual(1000);
    });

    it("should handle unknown rate limit rules", async () => {
      await expect(limiter.checkRateLimit("unknown_rule")).rejects.toThrow("Unknown rate limit rule");
    });

    it("should reset counters after window expires", async () => {
      // Fill up the limit
      for (let i = 0; i < 10; i++) {
        await limiter.checkRateLimit("market_data");
      }

      // Wait for the window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be able to make requests again
      await expect(limiter.checkRateLimit("market_data")).resolves.not.toThrow();
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return correct remaining requests", async () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await limiter.checkRateLimit("market_data");
      }

      const status = limiter.getRateLimitStatus("market_data");
      expect(status).toBeTruthy();
      expect(status?.remaining).toBe(5); // 10 max - 5 used = 5 remaining
    });

    it("should return null for unknown rules", () => {
      const status = limiter.getRateLimitStatus("unknown_rule");
      expect(status).toBeNull();
    });

    it("should update reset time correctly", async () => {
      const before = limiter.getRateLimitStatus("market_data")?.reset;
      await limiter.checkRateLimit("market_data");
      const after = limiter.getRateLimitStatus("market_data")?.reset;

      expect(before).toBe(after); // Reset time should stay the same within the window
    });
  });
});
