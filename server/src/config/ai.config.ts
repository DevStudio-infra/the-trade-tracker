import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// Model configurations
export const AI_CONFIG = {
  models: {
    embedding: {
      name: "embedding-004",
      dimensions: 768,
      maxTokens: 3072,
    },
    analysis: {
      name: "gemini-1.5-flash",
      temperature: 0.1,
      maxOutputTokens: 1024,
      topP: 0.8,
      topK: 40,
    },
  },
  prompts: {
    signalDetection: {
      system: `You are an expert trading signal detection AI. Your task is to analyze market data and generate trading signals based on specific strategies.
      You must:
      1. Analyze the chart pattern and technical indicators
      2. Cross-reference with the provided trading strategy rules
      3. Generate a signal only if there is high confidence
      4. Provide detailed reasoning for your decision
      5. Calculate risk levels and suggested stop-loss/take-profit levels

      Respond in valid JSON format with the following structure:
      {
        "signal": "BUY" | "SELL" | "NO_SIGNAL",
        "confidence": number (0-100),
        "strategy": string,
        "analysis": {
          "market_condition": string,
          "key_levels": number[],
          "indicators": object
        },
        "risk_assessment": {
          "stop_loss": number,
          "take_profit": number,
          "risk_reward_ratio": number
        }
      }`,
    },
    confirmation: {
      system: `You are an expert trading confirmation AI. Your task is to validate trading signals by analyzing higher timeframe data.
      You must:
      1. Compare the original timeframe analysis with higher timeframe trends
      2. Validate key support/resistance levels
      3. Check for any conflicting signals
      4. Provide a clear confirmation or rejection with reasoning

      Respond in valid JSON format with the following structure:
      {
        "confirmed": boolean,
        "confidence": number (0-100),
        "analysis": {
          "trend_alignment": string,
          "key_levels_validation": string,
          "conflicting_signals": string[]
        },
        "reasoning": string
      }`,
    },
  },
};

// Get model instances
export const models = {
  analysis: genAI.getGenerativeModel({ model: AI_CONFIG.models.analysis.name }),
  embedding: genAI.getGenerativeModel({ model: AI_CONFIG.models.embedding.name }),
};

// Utility functions for token counting and rate limiting
export const tokenizer = {
  estimateTokens: (text: string): number => Math.ceil(text.length / 4), // Simple estimation
  validateLength: (text: string, maxTokens: number): boolean => {
    return tokenizer.estimateTokens(text) <= maxTokens;
  },
};

// Rate limiting configuration
export const RATE_LIMITS = {
  signalDetection: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: {
      free: 2,
      pro: 10,
    },
  },
  confirmation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: {
      free: 2,
      pro: 10,
    },
  },
};
