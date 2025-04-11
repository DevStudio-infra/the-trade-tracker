import { createLogger } from "../../../utils/logger";

interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
  currentRequests: number;
  lastReset: number;
}

export class CapitalRateLimiter {
  private readonly logger = createLogger("capital-rate-limiter");
  private readonly rules: Map<string, RateLimitRule> = new Map();
  private readonly retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff delays

  constructor() {
    // Initialize rate limit rules based on Capital.com API documentation
    this.rules.set("global", { maxRequests: 600, windowMs: 60000, currentRequests: 0, lastReset: Date.now() }); // 600 requests per minute
    this.rules.set("market_data", { maxRequests: 10, windowMs: 1000, currentRequests: 0, lastReset: Date.now() }); // 10 requests per second
    this.rules.set("trading", { maxRequests: 100, windowMs: 10000, currentRequests: 0, lastReset: Date.now() }); // 100 requests per 10 seconds
    this.rules.set("account", { maxRequests: 60, windowMs: 60000, currentRequests: 0, lastReset: Date.now() }); // 60 requests per minute

    // Start cleanup interval
    setInterval(() => this.cleanup(), 60000).unref();
  }

  /**
   * Check and wait for rate limit
   */
  public async checkRateLimit(ruleKey: string, retryCount = 0): Promise<void> {
    const rule = this.rules.get(ruleKey);
    if (!rule) {
      throw new Error(`Unknown rate limit rule: ${ruleKey}`);
    }

    // Reset counter if window has passed
    if (Date.now() - rule.lastReset >= rule.windowMs) {
      rule.currentRequests = 0;
      rule.lastReset = Date.now();
    }

    // Check if limit is exceeded
    if (rule.currentRequests >= rule.maxRequests) {
      const delay = this.getRetryDelay(retryCount);
      this.logger.warn(`Rate limit exceeded for ${ruleKey}, waiting ${delay}ms before retry`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.checkRateLimit(ruleKey, retryCount + 1);
    }

    // Increment counter
    rule.currentRequests++;
  }

  /**
   * Get exponential backoff delay
   */
  private getRetryDelay(retryCount: number): number {
    return this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];
  }

  /**
   * Clean up expired windows
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, rule] of this.rules.entries()) {
      if (now - rule.lastReset >= rule.windowMs) {
        rule.currentRequests = 0;
        rule.lastReset = now;
      }
    }
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(ruleKey: string): { remaining: number; reset: number } | null {
    const rule = this.rules.get(ruleKey);
    if (!rule) return null;

    const remaining = Math.max(0, rule.maxRequests - rule.currentRequests);
    const reset = rule.lastReset + rule.windowMs;

    return { remaining, reset };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.rules.clear();
  }
}
