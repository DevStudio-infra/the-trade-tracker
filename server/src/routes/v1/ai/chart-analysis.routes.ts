import { Router } from "express";
import { authenticateUser } from "../../middleware/auth.middleware";
import { validateCredits } from "../../middleware/credits.middleware";
import { CandleService } from "../../../services/broker/common/candle.service";
import { BrokerService } from "../../../services/broker/broker.service";
import { prisma } from "../../../lib/prisma";
import { models } from "../../../config/ai.config";
import { createLogger } from "../../../utils/logger";
import { generateChartImage } from "../../../utils/chart.utils";
import { supabase } from "../../../lib/supabase";
import { ChartAnaylsisService } from "../../../services/ai/chart-analysis.service";
import { TIMEFRAME_MAP } from "../../../services/ai/confirmation/types";

const router = Router();
const logger = createLogger("chart-analysis-routes");
const brokerService = new BrokerService();
const chartAnalysisService = new ChartAnaylsisService();

/**
 * @route POST /api/ai/analyze
 * @desc Analyze chart using AI
 * @access Private
 */
router.post("/analyze", authenticateUser, validateCredits(1), async (req, res) => {
  try {
    const { pair, timeframe, credentialId, strategyId, customPrompt } = req.body;
    const userId = req.user!.id;

    // Validate request
    if (!pair || !timeframe || !credentialId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: pair, timeframe, credentialId",
      });
    }

    // Get broker credential
    const credential = await prisma.brokerCredential.findUnique({
      where: {
        id: credentialId,
        user_id: userId,
      },
    });

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Broker credential not found",
      });
    }

    // Get candle data
    const brokerAPI = brokerService.getBrokerAPI(credential.broker_name);
    if (!brokerAPI) {
      return res.status(400).json({
        success: false,
        message: "Unsupported broker",
      });
    }

    const broker = new brokerAPI(credential.credentials);
    const candleService = new CandleService(broker);

    // Get candles from cache or fetch from broker
    let candles = await candleService.getCandles(pair, timeframe, true);

    // Get strategy if provided
    let strategy = null;
    if (strategyId) {
      strategy = await prisma.strategy.findUnique({
        where: { id: strategyId },
      });

      if (!strategy) {
        return res.status(404).json({
          success: false,
          message: "Strategy not found",
        });
      }
    }

    // Generate chart image
    const chartImage = await generateChartImage(candles, strategy ? [strategy.name] : []);

    // Upload chart to storage
    const imagePath = `charts/${userId}/${pair}_${timeframe}_${Date.now()}.png`;
    const { data: imageData, error: uploadError } = await supabase.storage.from("trading").upload(imagePath, chartImage, {
      contentType: "image/png",
    });

    if (uploadError) {
      logger.error("Error uploading chart image:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload chart image",
      });
    }

    // Get public URL for chart image
    const { data: publicUrl } = supabase.storage.from("trading").getPublicUrl(imagePath);

    // Create a bot instance or use existing
    let botInstance = await prisma.botInstance.findFirst({
      where: {
        userId,
        pair,
        timeframe,
        strategyId: strategy?.id,
      },
    });

    if (!botInstance) {
      botInstance = await prisma.botInstance.create({
        data: {
          userId,
          strategyId: strategy?.id || "",
          pair,
          timeframe,
          riskSettings: {
            maxRiskPercent: 1,
            maxPositions: 3,
            requireConfirmation: true,
          },
          isActive: true,
        },
      });
    }

    // Perform AI analysis
    const analysisResult = await chartAnalysisService.analyzeChart({
      candles,
      pair,
      timeframe,
      strategy: strategy?.rules,
      customPrompt: customPrompt || "",
      chartImageUrl: publicUrl.publicUrl,
    });

    // Create signal record
    const signal = await prisma.signal.create({
      data: {
        userId,
        botInstanceId: botInstance.id,
        pair,
        timeframe,
        signalType: analysisResult.signal,
        confidence: analysisResult.confidence,
        stopLoss: analysisResult.risk_assessment.stop_loss,
        takeProfit: analysisResult.risk_assessment.take_profit,
        riskScore: Math.round(analysisResult.risk_percent_score),
        chartImageUrl: publicUrl.publicUrl,
        status: "PENDING",
      },
    });

    // Create chart image record
    await prisma.chartImage.create({
      data: {
        signalId: signal.id,
        timeframe,
        chartType: "CANDLESTICK",
        storagePath: imagePath,
        publicUrl: publicUrl.publicUrl,
        metadata: {
          indicators: ["EMA20", "RSI"],
          timestamp: Date.now(),
        },
      },
    });

    // Create AI evaluation record
    await prisma.aIEvaluation.create({
      data: {
        signalId: signal.id,
        botInstanceId: botInstance.id,
        evalType: "INITIAL",
        chartImageUrl: publicUrl.publicUrl,
        promptUsed: analysisResult.prompt,
        llmResponse: analysisResult.rawResponse,
        metadata: {
          strategy: strategy?.name || "Custom",
          customPrompt: !!customPrompt,
          model: "gemini-1.5-flash",
        },
      },
    });

    // Create a transaction for credits used
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (user) {
      await prisma.creditTransaction.create({
        data: {
          userId,
          creditsUsed: 1,
          action: "CHART_ANALYSIS",
          balanceBefore: user.credits,
          balanceAfter: user.credits - 1,
          metadata: {
            pair,
            timeframe,
            timestamp: Date.now(),
          },
        },
      });

      // Update user credits
      await prisma.user.update({
        where: { id: userId },
        data: { credits: user.credits - 1 },
      });
    }

    // Return response
    return res.json({
      id: signal.id,
      signalType: analysisResult.signal,
      confidence: analysisResult.confidence,
      analysis: {
        marketCondition: analysisResult.analysis.market_condition,
        keyLevels: analysisResult.analysis.key_levels || [],
        indicators: analysisResult.analysis.indicators || {},
      },
      riskAssessment: {
        stopLoss: analysisResult.risk_assessment.stop_loss,
        takeProfit: analysisResult.risk_assessment.take_profit,
        riskRewardRatio: analysisResult.risk_assessment.risk_reward_ratio,
      },
      chartImageUrl: publicUrl.publicUrl,
      createdAt: signal.createdAt.toISOString(),
    });
  } catch (error) {
    logger.error("Error analyzing chart:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to analyze chart",
    });
  }
});

/**
 * @route POST /api/ai/confirm-signal
 * @desc Confirm signal using higher timeframe analysis
 * @access Private
 */
router.post("/confirm-signal", authenticateUser, validateCredits(1), async (req, res) => {
  try {
    const { signalId, higherTimeframe } = req.body;
    const userId = req.user!.id;

    // Validate request
    if (!signalId || !higherTimeframe) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: signalId, higherTimeframe",
      });
    }

    // Get signal
    const signal = await prisma.signal.findUnique({
      where: {
        id: signalId,
        userId,
      },
      include: {
        botInstance: true,
      },
    });

    if (!signal) {
      return res.status(404).json({
        success: false,
        message: "Signal not found",
      });
    }

    // Get broker credential
    const credential = await prisma.brokerCredential.findFirst({
      where: {
        user_id: userId,
        is_active: true,
      },
    });

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "No active broker credential found",
      });
    }

    // Get candle data for higher timeframe
    const brokerAPI = brokerService.getBrokerAPI(credential.broker_name);
    if (!brokerAPI) {
      return res.status(400).json({
        success: false,
        message: "Unsupported broker",
      });
    }

    const broker = new brokerAPI(credential.credentials);
    const candleService = new CandleService(broker);

    let higherTFCandles = await candleService.getCandles(signal.pair, higherTimeframe, true);

    // Get strategy
    let strategy = null;
    if (signal.botInstance.strategyId) {
      strategy = await prisma.strategy.findUnique({
        where: { id: signal.botInstance.strategyId },
      });
    }

    // Generate chart image for higher timeframe
    const chartImage = await generateChartImage(higherTFCandles, strategy ? [strategy.name] : []);

    // Upload chart to storage
    const imagePath = `confirmations/${userId}/${signal.pair}_${higherTimeframe}_${Date.now()}.png`;
    const { data: imageData, error: uploadError } = await supabase.storage.from("trading").upload(imagePath, chartImage, {
      contentType: "image/png",
    });

    if (uploadError) {
      logger.error("Error uploading confirmation chart image:", uploadError);
      return res.status(500).json({
        success: false,
        message: "Failed to upload confirmation chart image",
      });
    }

    // Get public URL for chart image
    const { data: publicUrl } = supabase.storage.from("trading").getPublicUrl(imagePath);

    // Perform confirmation analysis
    const confirmationResult = await chartAnalysisService.confirmSignal({
      originalSignal: {
        id: signal.id,
        pair: signal.pair,
        timeframe: signal.timeframe,
        signalType: signal.signalType,
        confidence: signal.confidence,
        stopLoss: signal.stopLoss.toNumber(),
        takeProfit: signal.takeProfit.toNumber(),
      },
      higherTimeframe,
      candles: higherTFCandles,
      strategy: strategy?.rules,
      chartImageUrl: publicUrl.publicUrl,
    });

    // Update signal status
    await prisma.signal.update({
      where: { id: signalId },
      data: {
        status: confirmationResult.confirmed ? "CONFIRMED" : "REJECTED",
      },
    });

    // Create AI evaluation record
    await prisma.aIEvaluation.create({
      data: {
        signalId: signal.id,
        botInstanceId: signal.botInstanceId,
        evalType: "CONFIRMATION",
        chartImageUrl: publicUrl.publicUrl,
        promptUsed: confirmationResult.prompt,
        llmResponse: confirmationResult.rawResponse,
        metadata: {
          higherTimeframe,
          strategy: strategy?.name || "Custom",
          model: "gemini-1.5-flash",
        },
      },
    });

    // Create a transaction for credits used
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (user) {
      await prisma.creditTransaction.create({
        data: {
          userId,
          creditsUsed: 1,
          action: "SIGNAL_CONFIRMATION",
          balanceBefore: user.credits,
          balanceAfter: user.credits - 1,
          metadata: {
            signalId,
            higherTimeframe,
            timestamp: Date.now(),
          },
        },
      });

      // Update user credits
      await prisma.user.update({
        where: { id: userId },
        data: { credits: user.credits - 1 },
      });
    }

    // Return response
    return res.json({
      confirmed: confirmationResult.confirmed,
      confidence: confirmationResult.confidence,
      analysis: {
        trendAlignment: confirmationResult.analysis.trend_alignment,
        keyLevelsValidation: confirmationResult.analysis.key_levels_validation,
        conflictingSignals: confirmationResult.analysis.conflicting_signals || [],
      },
      reasoning: confirmationResult.reasoning,
      chartImageUrl: publicUrl.publicUrl,
    });
  } catch (error) {
    logger.error("Error confirming signal:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm signal",
    });
  }
});

/**
 * @route GET /api/ai/signals
 * @desc Get user's signals
 * @access Private
 */
router.get("/signals", authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 10, offset = 0, status } = req.query;

    const where = {
      userId,
      ...(status ? { status: status as string } : {}),
    };

    const signals = await prisma.signal.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: Number(limit),
      skip: Number(offset),
      include: {
        trade: true,
        ChartImage: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const total = await prisma.signal.count({ where });

    return res.json({
      signals,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    logger.error("Error getting signals:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get signals",
    });
  }
});

export const chartAnalysisRoutes = router;
