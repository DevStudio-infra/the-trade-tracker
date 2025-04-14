import { AutomatedTradingService } from "../../../services/trading/automated-trading.service";
import { AIService } from "../../../services/ai/ai.service";
import { ChartAnalysisService } from "../../../services/ai/chart-analysis.service";
import { CapitalService } from "../../../services/broker/capital-com/capital.service";
import { prisma } from "../../../lib/prisma";
import { createLogger } from "../../../utils/logger";
import { decrypt } from "../../../utils/encryption.utils";

const logger = createLogger("trading-service");
const aiService = new AIService();
const chartAnalysisService = new ChartAnalysisService();

interface BotConfig {
  pair: string;
  timeframe: string;
  strategyId: string;
  riskSettings: {
    maxRiskPerTrade: number;
    maxPositions?: number;
    maxDrawdown?: number;
    symbols?: string[];
  };
}

export async function initializeTradingService(userId: string, botConfig: BotConfig): Promise<AutomatedTradingService> {
  logger.info("Initializing trading service", { userId, botConfig });

  // Get user's broker credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      broker_credentials: {
        where: {
          broker_name: {
            mode: "insensitive",
            in: ["capital.com", "capital_com", "CAPITAL", "Capital.com"],
          },
          is_active: true,
        },
      },
    },
  });

  // Debug logging for user and credentials
  logger.debug("User and credentials check", {
    userId,
    hasUser: !!user,
    userBrokerCredentialsCount: user?.broker_credentials?.length || 0,
    brokerNames:
      user?.broker_credentials?.map((cred) => ({
        name: cred.broker_name,
        isActive: cred.is_active,
        isDemo: cred.is_demo,
        hasCredentials: !!cred.credentials,
      })) || [],
  });

  // Get all broker credentials for debugging
  const allCredentials = await prisma.brokerCredential.findMany({
    where: { user_id: userId },
    select: {
      id: true,
      user_id: true,
      broker_name: true,
      is_active: true,
      is_demo: true,
      created_at: true,
      credentials: true,
    },
  });

  logger.debug("All broker credentials for user", {
    userId,
    totalCredentials: allCredentials.length,
    credentials: allCredentials.map((cred) => ({
      id: cred.id,
      broker_name: cred.broker_name,
      is_active: cred.is_active,
      is_demo: cred.is_demo,
      hasCredentials: !!cred.credentials,
      credentialsType: typeof cred.credentials,
      credentialsKeys: cred.credentials ? Object.keys(cred.credentials) : [],
    })),
  });

  if (!user?.broker_credentials?.[0]) {
    logger.error("No Capital.com credentials found", {
      userId,
      hasUser: !!user,
      brokerCredentialsCount: user?.broker_credentials?.length || 0,
      allCredentialsCount: allCredentials.length,
      activeCredentials: allCredentials.filter((cred) => cred.is_active).length,
      capitalComCredentials: allCredentials.filter((cred) => cred.broker_name.toLowerCase().includes("capital") && cred.is_active).length,
    });
    throw new Error("No Capital.com credentials found");
  }

  const credentials = JSON.parse(decrypt(user.broker_credentials[0].credentials as string));

  logger.debug("Using broker credentials", {
    broker_name: user.broker_credentials[0].broker_name,
    is_demo: user.broker_credentials[0].is_demo,
    hasApiKey: !!credentials.apiKey,
    hasIdentifier: !!credentials.identifier,
    hasPassword: !!credentials.password,
    credentialsKeys: Object.keys(credentials),
  });

  // Initialize broker service with user's credentials
  const userBroker = new CapitalService({
    apiKey: credentials.apiKey,
    apiSecret: credentials.password,
    isDemo: user.broker_credentials[0].is_demo,
    timeout: 30000,
  });

  // Initialize trading service with user's broker
  const tradingService = new AutomatedTradingService(userBroker, aiService, chartAnalysisService, {
    maxPositions: botConfig.riskSettings?.maxPositions ?? 5,
    maxRiskPerTrade: botConfig.riskSettings.maxRiskPerTrade,
    maxDrawdown: botConfig.riskSettings?.maxDrawdown ?? 10,
    timeframes: [botConfig.timeframe],
    symbols: botConfig.riskSettings?.symbols ?? [botConfig.pair],
  });

  // Connect to broker
  try {
    await userBroker.connect();
  } catch (error) {
    logger.error("Failed to connect to broker", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
      broker: user.broker_credentials[0].broker_name,
    });
    throw error;
  }

  return tradingService;
}
