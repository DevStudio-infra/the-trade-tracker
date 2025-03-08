import { jest, beforeEach } from "@jest/globals";

// Mock environment variables
process.env.ENCRYPTION_KEY = "3323fef423f1b4dbfa890c1c3550bf38d6faad847079ca13fe821939eb71480c";
process.env.UPSTASH_REDIS_REST_URL = "https://test-redis-url";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";

// Capital.com API credentials for integration tests (optional)
if (process.env.NODE_ENV === "integration") {
  process.env.CAPITAL_API_KEY = process.env.CAPITAL_API_KEY || "";
  process.env.CAPITAL_API_SECRET = process.env.CAPITAL_API_SECRET || "";
}

// Increase test timeout for integration tests
if (process.env.NODE_ENV === "integration") {
  jest.setTimeout(60000); // 60 seconds
}

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
