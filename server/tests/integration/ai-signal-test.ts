import { config } from "dotenv";
import path from "path";
import fs from "fs/promises";
import { CapitalComService } from "../../src/services/broker/capital-com/capital-com.service";
import { ChartGenerator } from "../../src/services/ai/chart-generator.service";
import { SignalDetectionService } from "../../src/services/ai/signal-detection/signal-detection.service";
import { SignalConfirmationService } from "../../src/services/ai/confirmation/signal-confirmation.service";

// Load environment variables
config();

async function testAISignalDetection() {
  try {
    console.log("🚀 Starting AI Signal Detection Test\n");

    // Initialize services
    const capitalCom = new CapitalComService({
      apiKey: process.env.CAPITAL_API_KEY!,
      identifier: process.env.CAPITAL_IDENTIFIER!,
      password: process.env.CAPITAL_PASSWORD!,
    });

    const chartGenerator = new ChartGenerator();
    const signalDetection = new SignalDetectionService();
    const signalConfirmation = new SignalConfirmationService();

    // 1. Fetch candle data
    console.log("📊 Fetching candle data for EURUSD...");
    const candles = await capitalCom.getCandles("EURUSD", "1H", 400);
    console.log(`✅ Fetched ${candles.length} candles\n`);

    // 2. Generate chart image
    console.log("🎨 Generating chart image...");
    const chartImage = await chartGenerator.generateChart(candles, {
      pair: "EURUSD",
      timeframe: "1H",
      indicators: ["EMA20", "RSI"],
    });

    // Save chart image for inspection
    const outputDir = path.join(__dirname, "../../logs/test-outputs");
    await fs.mkdir(outputDir, { recursive: true });
    const chartPath = path.join(outputDir, `test-chart-${Date.now()}.png`);
    await fs.writeFile(chartPath, chartImage);
    console.log(`✅ Chart saved to: ${chartPath}\n`);

    // 3. Run signal detection
    console.log("🤖 Running signal detection (AI Agent #1)...");
    const signal = await signalDetection.detectSignal({
      pair: "EURUSD",
      timeframe: "1H",
      chartImage,
      candles,
      strategies: ["EMA_Pullback", "Mean_Reversion"],
    });

    console.log("\n📝 Signal Detection Results:");
    console.log(JSON.stringify(signal, null, 2));

    // 4. Run confirmation if confidence is high enough
    if (signal.confidence >= 75) {
      console.log("\n🔍 High confidence detected, running confirmation (AI Agent #2)...");

      // Fetch higher timeframe data
      const higherTfCandles = await capitalCom.getCandles("EURUSD", "4H", 400);

      // Generate higher timeframe chart
      const higherTfChart = await chartGenerator.generateChart(higherTfCandles, {
        pair: "EURUSD",
        timeframe: "4H",
        indicators: ["EMA20", "RSI"],
      });

      // Save higher timeframe chart
      const higherTfChartPath = path.join(outputDir, `test-chart-4h-${Date.now()}.png`);
      await fs.writeFile(higherTfChartPath, higherTfChart);
      console.log(`✅ Higher timeframe chart saved to: ${higherTfChartPath}\n`);

      const confirmation = await signalConfirmation.confirmSignal({
        originalSignal: signal,
        higherTimeframeChart: higherTfChart,
        higherTimeframeCandles: higherTfCandles,
      });

      console.log("📝 Confirmation Results:");
      console.log(JSON.stringify(confirmation, null, 2));
    } else {
      console.log("\n⚠️ Signal confidence too low for confirmation");
    }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  }
}

// Run the test
testAISignalDetection();
