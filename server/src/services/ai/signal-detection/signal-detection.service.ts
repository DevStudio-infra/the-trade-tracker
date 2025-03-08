import { GoogleGenerativeAI } from "@google/generative-ai";
import { SignalRequest, SignalResponse } from "../../../types/ai.types";
import { ChartGenerator } from "../chart-generator.service";

export class SignalDetectionService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chartGenerator: ChartGenerator;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.chartGenerator = new ChartGenerator();
  }

  async detectSignal(request: SignalRequest): Promise<SignalResponse> {
    try {
      console.log("Starting signal detection...");

      // Convert chart image to base64 for the prompt
      const base64Image = request.chartImage.toString("base64");
      console.log(`Image size: ${request.chartImage.length} bytes`);
      console.log(`Base64 image size: ${base64Image.length} characters`);

      // Create prompt for the AI
      const prompt = this.createPrompt(request);

      // Get response from AI
      console.log("Sending request to AI model...");
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Image,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        },
      });

      console.log("Received response from AI model");
      const response = result.response;
      const analysisText = response.text();
      console.log("Raw AI response:", analysisText);

      // Parse the AI response
      return this.parseAIResponse(analysisText, request.pair);
    } catch (error) {
      console.error("Signal detection failed:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      throw new Error("Failed to detect trading signal");
    }
  }

  private createPrompt(request: SignalRequest): string {
    return `
You are an expert trading signal detector. Analyze this chart for ${request.pair} on the ${request.timeframe} timeframe.

Available Strategies:

1. EMA Pullback Strategy:
   - Entry Rules:
     * Price must be in an established trend (determined by EMA20 direction)
     * Price pulls back to the EMA20 (touches or comes very close)
     * RSI should not be extremely overbought (>70) for buys or oversold (<30) for sells
   - Exit Rules:
     * Stop loss: Below the recent swing low for buys, above swing high for sells
     * Take profit: At least 2:1 risk-reward ratio

2. Mean Reversion Strategy:
   - Entry Rules:
     * Price deviates significantly from EMA20 (at least 1% away)
     * RSI shows overbought (>70) for sells or oversold (<30) for buys
     * Price shows signs of reversal (such as rejection candles)
   - Exit Rules:
     * Stop loss: Beyond the extreme point of the deviation
     * Take profit: When price returns to EMA20

The chart shows price action with EMA20 (blue line) and RSI (orange line in bottom panel). RSI overbought level is 70 and oversold level is 30 (shown as horizontal lines in RSI panel).

Please analyze:
1. Current market condition and trend
2. Price's position relative to EMA20
3. RSI conditions and signals
4. Potential trade setup based on the strategies above
5. If a trade is identified:
   - Specify entry price (current price)
   - Calculate stop loss based on strategy rules
   - Calculate take profit based on strategy rules
   - Assign confidence score (0-100) based on how well setup matches rules
   - Calculate risk assessment score (0-100) based on:
     * Clean price action (no choppy movements)
     * Clear trend direction
     * RSI alignment
     * Risk-reward ratio

Provide your analysis in this JSON format:
{
    "signal": "BUY|SELL|NO_SIGNAL",
    "confidence": number,
    "strategy": "EMA_Pullback|Mean_Reversion",
    "stop_loss": number,
    "take_profit": number,
    "risk_percent_score": number,
    "analysis": {
        "market_condition": "detailed description of current market conditions",
        "strategy_rules_met": boolean,
        "filters_passed": ["list of specific rules that were met"]
    }
}

Analyze the chart image provided and give me your assessment.
`;
  }

  private parseAIResponse(response: string, pair: string): SignalResponse {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        pair,
        signal: parsed.signal,
        confidence: parsed.confidence,
        strategy: parsed.strategy,
        stop_loss: parsed.stop_loss,
        take_profit: parsed.take_profit,
        risk_percent_score: parsed.risk_percent_score,
        analysis: parsed.analysis,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Failed to parse signal detection response");
    }
  }
}
