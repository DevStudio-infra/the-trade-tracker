import { z } from "zod";

export const createBotSchema = z.object({
  name: z.string().min(1, "Bot name is required"),
  description: z.string().optional(),
  pair: z.string().min(1, "Trading pair is required"),
  timeframe: z.string().min(1, "Timeframe is required"),
  strategyId: z.string().min(1, "Strategy is required"),
  riskSettings: z.object({
    maxRiskPerTrade: z.number().min(0.1).max(100),
    maxPositions: z.number().min(1).max(100).optional(),
    maxDrawdown: z.number().min(1).max(100).optional(),
    symbols: z.array(z.string()).optional(),
  }),
});
