import { models, AI_CONFIG } from "../../../config/ai.config";
import { prisma } from "../../../lib/prisma";
import { generateChartImage } from "../../../utils/chart.utils";
import { supabase } from "../../../lib/supabase";
import { redis } from "../../../lib/redis";
import { CandleData } from "../signal-detection/types";
import { ConfirmationRequest, ConfirmationResponse, TIMEFRAME_MAP } from "./types";

export class ConfirmationService {
  private readonly model = models.analysis;

  async confirmSignal(request: ConfirmationRequest): Promise<ConfirmationResponse> {
    try {
      // 1. Fetch higher timeframe candle data from Redis
      const higherTFCandles = await this.fetchCandleData(request.pair, request.higherTimeframe);

      // 2. Generate higher timeframe chart image
      const chartImage = await generateChartImage(higherTFCandles, [request.originalSignal.strategy]);

      // 3. Upload chart to Supabase storage
      const { data: imageData, error: uploadError } = await supabase.storage.from("charts").upload(`confirmations/${request.signalId}_${Date.now()}.png`, chartImage);

      if (uploadError) throw new Error("Failed to upload confirmation chart image");

      // 4. Prepare prompt with higher timeframe data and original signal
      const prompt = this.preparePrompt(higherTFCandles, request);

      // 5. Get AI confirmation analysis
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      // 6. Update signal status in database based on confirmation
      await prisma.signal.update({
        where: { id: request.signalId },
        data: {
          status: analysis.confirmed ? "CONFIRMED" : "REJECTED",
        },
      });

      // 7. Create AI evaluation record for confirmation
      await prisma.aIEvaluation.create({
        data: {
          signalId: request.signalId,
          evaluationType: "Confirmation",
          chartImageUrl: imageData.path,
          promptUsed: prompt,
          llmResponse: analysis,
          metadata: {
            model_version: AI_CONFIG.models.analysis.name,
            chart_timeframe: request.higherTimeframe,
            original_timeframe: request.userTimeframe,
            processing_time_ms: Date.now() - request.timestamp,
          },
        },
      });

      // 8. Return formatted response
      return {
        confirmed: analysis.confirmed,
        confidence: analysis.confidence,
        analysis: {
          trend_alignment: analysis.analysis.trend_alignment,
          key_levels_validation: analysis.analysis.key_levels_validation,
          conflicting_signals: analysis.analysis.conflicting_signals,
        },
        reasoning: analysis.reasoning,
        chart_image_url: imageData.path,
      };
    } catch (error) {
      console.error("Signal confirmation error:", error);
      throw new Error("Failed to confirm trading signal");
    }
  }

  private async fetchCandleData(pair: string, timeframe: string): Promise<CandleData[]> {
    const cacheKey = `pair:${pair}:tf:${timeframe}:candles`;
    const cachedData = await redis.get(cacheKey);

    if (!cachedData) {
      throw new Error("Higher timeframe candle data not found in cache");
    }

    return JSON.parse(cachedData);
  }

  private preparePrompt(candles: CandleData[], request: ConfirmationRequest): string {
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
      original_signal: {
        type: request.originalSignal.type,
        confidence: request.originalSignal.confidence,
        strategy: request.originalSignal.strategy,
        stop_loss: request.originalSignal.stopLoss,
        take_profit: request.originalSignal.takeProfit,
      },
      timeframes: {
        user_tf: request.userTimeframe,
        higher_tf: request.higherTimeframe,
      },
      request:
        "Analyze the higher timeframe data to confirm or reject the original trading signal. Focus on trend alignment, key level validation, and potential conflicting signals.",
    });
  }

  getHigherTimeframe(timeframe: string): string {
    const higher = TIMEFRAME_MAP[timeframe];
    if (!higher) {
      throw new Error(`No higher timeframe mapping found for ${timeframe}`);
    }
    return higher;
  }
}
