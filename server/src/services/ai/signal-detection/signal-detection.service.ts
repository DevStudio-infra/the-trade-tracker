import { models, AI_CONFIG } from "../../../config/ai.config";
import { prisma } from "../../../lib/prisma";
import { generateChartImage } from "../../../utils/chart.utils";
import { supabase } from "../../../lib/supabase";
import { redis } from "../../../lib/redis";
import { CandleData, SignalRequest, SignalResponse } from "./types";

export class SignalDetectionService {
  private readonly model = models.analysis;

  async detectSignal(request: SignalRequest): Promise<SignalResponse> {
    try {
      // 1. Fetch candle data from Redis
      const candles = await this.fetchCandleData(request.pair, request.timeframe);

      // 2. Generate chart image
      const chartImage = await generateChartImage(candles, request.strategies);

      // 3. Upload chart to Supabase storage
      const { data: imageData, error: uploadError } = await supabase.storage
        .from("charts")
        .upload(`signals/${Date.now()}.png`, chartImage);

      if (uploadError) throw new Error("Failed to upload chart image");

      // 4. Prepare prompt with chart data and strategies
      const prompt = this.preparePrompt(candles, request.strategies);

      // 5. Get AI analysis
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      // 6. Create signal record in database
      const signal = await prisma.signal.create({
        data: {
          userId: request.userId,
          pair: request.pair,
          timeframe: request.timeframe,
          signalType: analysis.signal,
          confidence: analysis.confidence,
          strategy: analysis.strategy,
          stopLoss: analysis.risk_assessment.stop_loss,
          takeProfit: analysis.risk_assessment.take_profit,
          riskPercentScore: this.calculateRiskScore(analysis),
          chartImageUrl: imageData.path,
          status: "PENDING_CONFIRMATION",
        },
      });

      // 7. Create AI evaluation record
      await prisma.aIEvaluation.create({
        data: {
          signalId: signal.id,
          evaluationType: "Initial_Analysis",
          chartImageUrl: imageData.path,
          promptUsed: prompt,
          llmResponse: analysis,
          metadata: {
            model_version: AI_CONFIG.models.analysis.name,
            chart_timeframe: request.timeframe,
            indicators_used: request.strategies,
            processing_time_ms: Date.now() - request.timestamp,
          },
        },
      });

      // 8. Return formatted response
      return {
        signal_id: signal.id,
        pair: request.pair,
        signal_type: analysis.signal,
        confidence: analysis.confidence,
        strategy: analysis.strategy,
        stop_loss: analysis.risk_assessment.stop_loss,
        take_profit: analysis.risk_assessment.take_profit,
        risk_percent_score: this.calculateRiskScore(analysis),
        chart_image_url: imageData.path,
        analysis: {
          market_condition: analysis.analysis.market_condition,
          key_levels: analysis.analysis.key_levels,
          indicators: analysis.analysis.indicators,
        },
      };
    } catch (error) {
      console.error("Signal detection error:", error);
      throw new Error("Failed to generate trading signal");
    }
  }

  private async fetchCandleData(pair: string, timeframe: string): Promise<CandleData[]> {
    const cacheKey = `pair:${pair}:tf:${timeframe}:candles`;
    const cachedData = await redis.get(cacheKey);

    if (!cachedData) {
      throw new Error("Candle data not found in cache");
    }

    return JSON.parse(cachedData);
  }

  private preparePrompt(candles: CandleData[], strategies: string[]): string {
    const candleData = candles.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return JSON.stringify({
      candles: candleData,
      strategies: strategies,
      request: "Analyze the provided candle data using the specified strategies and generate a trading signal if a valid setup is found.",
    });
  }

  private calculateRiskScore(analysis: any): number {
    const confidenceWeight = 0.4;
    const riskRewardWeight = 0.3;
    const marketConditionWeight = 0.3;

    const confidenceScore = analysis.confidence;
    const riskRewardScore = Math.min(analysis.risk_assessment.risk_reward_ratio * 20, 100);

    let marketConditionScore = 0;
    if (analysis.analysis.market_condition.toLowerCase().includes("strong")) {
      marketConditionScore = 100;
    } else if (analysis.analysis.market_condition.toLowerCase().includes("moderate")) {
      marketConditionScore = 70;
    } else {
      marketConditionScore = 40;
    }

    return Math.round(confidenceScore * confidenceWeight + riskRewardScore * riskRewardWeight + marketConditionScore * marketConditionWeight);
  }
}
