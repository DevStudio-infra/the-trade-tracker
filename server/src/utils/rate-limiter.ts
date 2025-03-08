export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private lastRequestTime = 0;

  /**
   * Creates a new rate limiter
   * @param maxRequests Maximum number of requests allowed in the time window
   * @param timeWindowMs Time window in milliseconds
   */
  constructor(private maxRequests: number, private timeWindowMs: number) {}

  /**
   * Acquires a token to make a request
   * @returns Promise that resolves when the request can be made
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeToWait = Math.max(0, this.lastRequestTime + this.timeWindowMs / this.maxRequests - now);

      if (timeToWait > 0) {
        await new Promise((resolve) => setTimeout(resolve, timeToWait));
      }

      const resolve = this.queue.shift();
      if (resolve) {
        this.lastRequestTime = Date.now();
        resolve();
      }
    }

    this.processing = false;
  }
}
