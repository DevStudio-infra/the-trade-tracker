import { createLogger } from "../../utils/logger";
import { GeneratedChart } from "../chart/chart-generator.service";

const logger = createLogger("ai-service");

export interface ChartAnalysis {
  shouldTrade: boolean;
  direction: "LONG" | "SHORT";
  confidence: number;
  entryPrice: number;
  positionSize: number;
  riskScore: number;
  indicators: {
    name: string;
    value: number;
    interpretation: string;
  }[];
}

export class AIService {
  /**
   * Analyze chart and generate trading signals
   */
  async analyzeChart(chart: GeneratedChart, strategyRules: any): Promise<ChartAnalysis> {
    try {
      // Get the latest candle
      const latestCandle = chart.data[chart.data.length - 1];

      // Analyze technical indicators
      const indicatorAnalysis = await this.analyzeIndicators(chart.indicators, strategyRules);

      // Determine trade direction and confidence
      const { direction, confidence } = this.determineTrade(indicatorAnalysis, strategyRules);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(indicatorAnalysis, confidence);

      // Determine position size based on risk score
      const positionSize = this.calculatePositionSize(riskScore, latestCandle.close);

      return {
        shouldTrade: confidence > 70, // Only trade with high confidence
        direction,
        confidence,
        entryPrice: latestCandle.close,
        positionSize,
        riskScore,
        indicators: indicatorAnalysis,
      };
    } catch (error) {
      logger.error("Error analyzing chart:", error);
      throw new Error("Failed to analyze chart");
    }
  }

  /**
   * Analyze technical indicators against strategy rules
   */
  private async analyzeIndicators(indicators: Record<string, number[]>, rules: any): Promise<Array<{ name: string; value: number; interpretation: string }>> {
    try {
      const analysis = [];

      // Analyze each indicator
      for (const [name, values] of Object.entries(indicators)) {
        const latestValue = values[values.length - 1];
        const interpretation = this.interpretIndicator(name, latestValue, rules);

        analysis.push({
          name,
          value: latestValue,
          interpretation,
        });
      }

      return analysis;
    } catch (error) {
      logger.error("Error analyzing indicators:", error);
      throw error;
    }
  }

  /**
   * Determine trade direction and confidence based on indicator analysis
   */
  private determineTrade(indicatorAnalysis: Array<{ name: string; value: number; interpretation: string }>, rules: any): { direction: "LONG" | "SHORT"; confidence: number } {
    try {
      // Count bullish and bearish signals
      let bullishSignals = 0;
      let bearishSignals = 0;

      indicatorAnalysis.forEach((indicator) => {
        if (indicator.interpretation === "BULLISH") bullishSignals++;
        if (indicator.interpretation === "BEARISH") bearishSignals++;
      });

      // Calculate confidence based on signal agreement
      const totalSignals = bullishSignals + bearishSignals;
      const confidence = Math.round((Math.max(bullishSignals, bearishSignals) / totalSignals) * 100);

      // Determine direction
      const direction = bullishSignals > bearishSignals ? "LONG" : "SHORT";

      return { direction, confidence };
    } catch (error) {
      logger.error("Error determining trade:", error);
      throw error;
    }
  }

  /**
   * Calculate risk score based on indicator analysis and confidence
   */
  private calculateRiskScore(indicatorAnalysis: Array<{ name: string; value: number; interpretation: string }>, confidence: number): number {
    try {
      // Base risk score on confidence
      let riskScore = Math.round(confidence / 20); // 0-5 scale

      // Adjust based on indicator agreement
      const disagreement = indicatorAnalysis.some((ind) => ind.interpretation === "NEUTRAL");

      if (disagreement) riskScore--;

      // Ensure score is within bounds
      return Math.max(1, Math.min(5, riskScore));
    } catch (error) {
      logger.error("Error calculating risk score:", error);
      throw error;
    }
  }

  /**
   * Calculate suggested position size based on risk score
   */
  private calculatePositionSize(riskScore: number, currentPrice: number): number {
    try {
      // Base position size on risk score (1-5)
      const baseSize = 1000; // Base position size
      const riskMultiplier = riskScore / 5; // 0.2 to 1.0

      return baseSize * riskMultiplier;
    } catch (error) {
      logger.error("Error calculating position size:", error);
      throw error;
    }
  }

  /**
   * Interpret indicator value against strategy rules
   */
  private interpretIndicator(name: string, value: number, rules: any): "BULLISH" | "BEARISH" | "NEUTRAL" {
    try {
      // TODO: Implement proper indicator interpretation based on strategy rules
      // For now, return a random interpretation
      const random = Math.random();
      if (random > 0.66) return "BULLISH";
      if (random > 0.33) return "BEARISH";
      return "NEUTRAL";
    } catch (error) {
      logger.error("Error interpreting indicator:", error);
      throw error;
    }
  }
}
