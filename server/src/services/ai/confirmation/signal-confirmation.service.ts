import { GoogleGenerativeAI } from "@google/generative-ai";
import { SignalConfirmationRequest, SignalConfirmationResponse } from "../../../types/ai.types";

export class SignalConfirmationService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async confirmSignal(request: SignalConfirmationRequest): Promise<SignalConfirmationResponse> {
    try {
      // Convert chart image to base64 for the prompt
      const base64Image = request.higherTimeframeChart.toString("base64");

      // Create prompt for the AI
      const prompt = this.createPrompt(request);

      // Get response from AI
      const result = await this.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const response = result.response;
      const analysisText = response.text();

      // Parse the AI response
      return this.parseAIResponse(analysisText);
    } catch (error) {
      console.error("Signal confirmation failed:", error);
      throw new Error("Failed to confirm trading signal");
    }
  }

  private createPrompt(request: SignalConfirmationRequest): string {
    return `
You are an expert trading signal confirmation analyst. Review this higher timeframe chart to confirm or reject the following signal:

Original Signal:
- Pair: ${request.originalSignal.pair}
- Type: ${request.originalSignal.signal}
- Strategy: ${request.originalSignal.strategy}
- Confidence: ${request.originalSignal.confidence}%
- Stop Loss: ${request.originalSignal.stop_loss}
- Take Profit: ${request.originalSignal.take_profit}

The higher timeframe chart shows price action with EMA20 (blue line) and RSI (orange line in bottom panel). RSI overbought level is 70 and oversold level is 30 (shown as horizontal lines in RSI panel).

Please analyze:
1. Higher timeframe trend alignment with the original signal
2. Key support/resistance levels near the proposed entry, stop loss, and take profit
3. RSI momentum confirmation
4. Risk/reward assessment considering the higher timeframe perspective

Consider these confirmation criteria:
1. Higher timeframe trend should align with the trade direction
2. No major support/resistance levels between entry and target
3. RSI should not contradict the trade direction
4. Risk/reward should remain favorable at higher timeframe

Provide your analysis in this JSON format:
{
    "isConfirmed": boolean,
    "confidence": number,
    "analysis": {
        "higher_timeframe_trend": "detailed description of higher timeframe trend",
        "confirmation_factors": ["list of specific confirmations found"],
        "risk_assessment": {
            "adjusted_stop_loss": number (optional),
            "adjusted_take_profit": number (optional),
            "risk_reward_ratio": number
        }
    }
}

Analyze the chart image provided and give me your assessment.
`;
  }

  private parseAIResponse(response: string): SignalConfirmationResponse {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in AI response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        isConfirmed: parsed.isConfirmed,
        confidence: parsed.confidence,
        analysis: parsed.analysis,
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Failed to parse signal confirmation response");
    }
  }
}
