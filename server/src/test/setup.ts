import { jest, beforeEach } from "@jest/globals";

// Mock environment variables
process.env.ENCRYPTION_KEY = "3323fef423f1b4dbfa890c1c3550bf38d6faad847079ca13fe821939eb71480c";
process.env.UPSTASH_REDIS_REST_URL = "https://test-redis-url";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-redis-token";

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
