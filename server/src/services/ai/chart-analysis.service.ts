import { GoogleGenerativeAI } from "@google/generative-ai";
import { models } from "../../config/ai.config";
import { createLogger } from "../../utils/logger";

const logger = createLogger("chart-analysis-service");

export interface ChartAnalysisRequest {
  candles: any[];
  pair: string;
  timeframe: string;
  strategy?: any;
  customPrompt?: string;
  chartImageUrl?: string;
}

export interface ChartAnalysisResponse {
  signal: "BUY" | "SELL" | "NO_SIGNAL";
  confidence: number;
  strategy?: string;
  analysis: {
    market_condition: string;
    key_levels?: number[];
    strategy_rules_met?: boolean;
    filters_passed?: string[];
    indicators: any;
  };
  risk_assessment: {
    stop_loss: number;
    take_profit: number;
    risk_reward_ratio: number;
  };
  risk_percent_score: number;
  prompt: string;
  rawResponse: any;
}

export interface SignalConfirmationRequest {
  originalSignal: {
    id: string;
    pair: string;
    timeframe: string;
    signalType: string;
    confidence: number;
    stopLoss: number;
    takeProfit: number;
  };
  higherTimeframe: string;
  candles: any[];
  strategy?: any;
  chartImageUrl?: string;
}

export interface SignalConfirmationResponse {
  confirmed: boolean;
  confidence: number;
  analysis: {
    trend_alignment: boolean;
    key_levels_validation: boolean;
    conflicting_signals?: string[];
  };
  reasoning: string;
  prompt: string;
  rawResponse: any;
}

export class ChartAnaylsisService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    this.model = models.analysis;
  }

  async analyzeChart(request: ChartAnalysisRequest): Promise<ChartAnalysisResponse> {
    try {
      const prompt = this.createAnalysisPrompt(request);
      logger.info(`Analyzing chart for ${request.pair} ${request.timeframe}`);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response - handle potential formatting issues
      const jsonStr = this.extractJsonFromText(text);
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(jsonStr);
      } catch (error) {
        logger.error("Failed to parse AI response as JSON:", error);
        logger.debug("Raw response:", text);
        throw new Error("Failed to parse analysis response");
      }

      return {
        signal: parsedResponse.signal,
        confidence: parsedResponse.confidence,
        strategy: parsedResponse.strategy,
        analysis: {
          market_condition: parsedResponse.analysis.market_condition,
          key_levels: parsedResponse.analysis.key_levels || [],
          strategy_rules_met: parsedResponse.analysis.strategy_rules_met,
          filters_passed: parsedResponse.analysis.filters_passed || [],
          indicators: parsedResponse.analysis.indicators || {},
        },
        risk_assessment: {
          stop_loss: parsedResponse.stop_loss,
          take_profit: parsedResponse.take_profit,
          risk_reward_ratio:
            (parsedResponse.take_profit - parsedResponse.risk_assessment?.entry_price || 0) /
            (Math.abs(parsedResponse.stop_loss - parsedResponse.risk_assessment?.entry_price || 0) || 1),
        },
        risk_percent_score: parsedResponse.risk_percent_score,
        prompt,
        rawResponse: parsedResponse,
      };
    } catch (error) {
      logger.error("Error analyzing chart:", error);
      throw new Error("Failed to analyze chart");
    }
  }

  async confirmSignal(request: SignalConfirmationRequest): Promise<SignalConfirmationResponse> {
    try {
      const prompt = this.createConfirmationPrompt(request);
      logger.info(`Confirming signal ${request.originalSignal.id} for ${request.originalSignal.pair}`);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response - handle potential formatting issues
      const jsonStr = this.extractJsonFromText(text);
      let parsedResponse;

      try {
        parsedResponse = JSON.parse(jsonStr);
      } catch (error) {
        logger.error("Failed to parse AI confirmation response as JSON:", error);
        logger.debug("Raw response:", text);
        throw new Error("Failed to parse confirmation response");
      }

      return {
        confirmed: parsedResponse.confirmed,
        confidence: parsedResponse.confidence,
        analysis: {
          trend_alignment: parsedResponse.analysis.trend_alignment,
          key_levels_validation: parsedResponse.analysis.key_levels_validation,
          conflicting_signals: parsedResponse.analysis.conflicting_signals || [],
        },
        reasoning: parsedResponse.reasoning,
        prompt,
        rawResponse: parsedResponse,
      };
    } catch (error) {
      logger.error("Error confirming signal:", error);
      throw new Error("Failed to confirm signal");
    }
  }

  private createAnalysisPrompt(request: ChartAnalysisRequest): string {
    // Format candles for easier reading
    const formattedCandles = request.candles.slice(-20).map((c) => ({
      timestamp: new Date(c.timestamp).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    // Basic strategy if none provided
    const defaultStrategy = {
      name: "Default Strategy",
      rules: {
        entry: ["Buy when price is above EMA20 and RSI is above 50", "Sell when price is below EMA20 and RSI is below 50"],
        exit: ["Exit buy when price falls below EMA20", "Exit sell when price rises above EMA20"],
        indicators: ["EMA20", "RSI"],
      },
    };

    const strategyToUse = request.strategy || defaultStrategy;

    return `
You are an expert trading signal detection AI. Your task is to analyze market data for ${request.pair} on ${request.timeframe} timeframe and generate trading signals based on technical analysis.

${request.chartImageUrl ? `Chart image URL: ${request.chartImageUrl}` : ""}

Recent candle data (most recent 20 candles):
${JSON.stringify(formattedCandles, null, 2)}

Strategy being applied:
${JSON.stringify(strategyToUse, null, 2)}

${request.customPrompt ? `Additional context: ${request.customPrompt}` : ""}

You must:
1. Analyze the chart pattern and technical indicators
2. Cross-reference with the provided trading strategy rules
3. Generate a signal only if there is high confidence
4. Provide detailed reasoning for your decision
5. Calculate risk levels and suggested stop-loss/take-profit levels

Provide your analysis in this JSON format:
{
    "signal": "BUY"|"SELL"|"NO_SIGNAL",
    "confidence": number (0-100),
    "strategy": "Strategy Name",
    "analysis": {
        "market_condition": "detailed description of current market conditions",
        "key_levels": [list of key support/resistance levels],
        "strategy_rules_met": boolean,
        "filters_passed": ["list of specific rules that were met"],
        "indicators": {
            "indicator_name": "indication value and description"
        }
    },
    "stop_loss": number,
    "take_profit": number,
    "risk_percent_score": number (0-100)
}

Your response MUST be valid JSON. Use a low value for confidence unless the signal is very clear.
`;
  }

  private createConfirmationPrompt(request: SignalConfirmationRequest): string {
    // Format candles for easier reading
    const formattedCandles = request.candles.slice(-20).map((c) => ({
      timestamp: new Date(c.timestamp).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return `
You are an expert trading signal confirmation AI. Your task is to validate a trading signal detected on a lower timeframe by analyzing the higher timeframe chart.

${request.chartImageUrl ? `Chart image URL: ${request.chartImageUrl}` : ""}

Original Signal Details:
- Pair: ${request.originalSignal.pair}
- Original Timeframe: ${request.originalSignal.timeframe}
- Higher Timeframe: ${request.higherTimeframe}
- Signal Type: ${request.originalSignal.signalType}
- Confidence: ${request.originalSignal.confidence}%
- Stop Loss: ${request.originalSignal.stopLoss}
- Take Profit: ${request.originalSignal.takeProfit}

Recent higher timeframe candle data (${request.higherTimeframe}):
${JSON.stringify(formattedCandles, null, 2)}

${request.strategy ? `Strategy being applied: ${JSON.stringify(request.strategy, null, 2)}` : ""}

You must:
1. Determine if the higher timeframe confirms the lower timeframe signal
2. Verify if the market trend on higher timeframe aligns with the signal
3. Check if key levels on higher timeframe validate the signal
4. Identify any conflicting signals on higher timeframe
5. Provide detailed reasoning for your decision

Provide your confirmation analysis in this JSON format:
{
    "confirmed": boolean,
    "confidence": number (0-100),
    "analysis": {
        "trend_alignment": boolean,
        "key_levels_validation": boolean,
        "conflicting_signals": ["list of any conflicting signals or conditions"]
    },
    "reasoning": "detailed explanation of your confirmation analysis"
}

Your response MUST be valid JSON.
`;
  }

  private extractJsonFromText(text: string): string {
    // Try to extract JSON from the text in case there's additional text
    const jsonRegex = /{[\s\S]*}/;
    const match = text.match(jsonRegex);
    return match ? match[0] : text;
  }
}
