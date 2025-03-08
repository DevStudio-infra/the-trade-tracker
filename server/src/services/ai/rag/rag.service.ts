import { models } from "../../../config/ai.config";
import { prisma } from "../../../lib/prisma";
import { createLogger } from "../../../utils/logger";
import { Prisma } from "@prisma/client";
import { StrategyRules } from "./types";

const logger = createLogger("rag-service");

export class RAGService {
  private readonly embeddingModel = models.embedding;

  async generateEmbeddings(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      // Convert embedding to number array
      return Object.values(result.embedding);
    } catch (error) {
      logger.error({
        message: "Error generating embeddings",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to generate embeddings");
    }
  }

  async addStrategyToRAG(name: string, description: string, rules: StrategyRules, timeframes: string[], riskParameters: Record<string, any>): Promise<void> {
    try {
      // Create strategy text for embedding
      const strategyText = `
        Strategy Name: ${name}
        Description: ${description}
        Entry Rules: ${JSON.stringify(rules.entry)}
        Exit Rules: ${JSON.stringify(rules.exit)}
        Indicators: ${JSON.stringify(rules.indicators)}
        Timeframes: ${timeframes.join(", ")}
        Risk Parameters: ${JSON.stringify(riskParameters)}
      `;

      // Generate embeddings
      const embedding = await this.generateEmbeddings(strategyText);

      const data: Prisma.StrategyCreateInput = {
        name,
        description,
        rules: rules as any,
        timeframes: {
          set: timeframes,
        },
        riskParameters: riskParameters as any,
        isActive: true,
      };

      // Create strategy
      const strategy = await prisma.strategy.create({ data });

      // Create embedding
      await prisma.rAGEmbedding.create({
        data: {
          strategyId: strategy.id,
          embedding,
          metadata: {
            embedding_version: "004",
            strategy_type: rules.type || "unknown",
            market_conditions: rules.market_conditions || [],
            typical_timeframes: timeframes,
          },
        },
      });

      logger.info({
        message: "Strategy added to RAG system",
        strategy: name,
      });
    } catch (error) {
      logger.error({
        message: "Error adding strategy to RAG",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to add strategy to RAG system");
    }
  }

  async enhancePromptWithBotStrategy(basePrompt: string, marketContext: string, botInstanceId: string): Promise<string> {
    try {
      // Get bot instance with its strategy
      const botInstance = await prisma.botInstance.findUnique({
        where: { id: botInstanceId },
        include: {
          strategy: true,
        },
      });

      if (!botInstance) {
        throw new Error("Bot instance not found");
      }

      const rules = botInstance.strategy.rules as unknown as StrategyRules;
      // Create strategy context
      const strategyContext = `
        Selected Strategy: ${botInstance.strategy.name}
        Description: ${botInstance.strategy.description}
        Entry Rules: ${JSON.stringify(rules.entry)}
        Exit Rules: ${JSON.stringify(rules.exit)}
        Indicators: ${JSON.stringify(rules.indicators)}
        Risk Settings: ${JSON.stringify(botInstance.riskSettings)}
      `;

      // Enhance the prompt with strategy context
      return `
        Market Context:
        ${marketContext}

        Bot Strategy Configuration:
        ${strategyContext}

        Base Prompt:
        ${basePrompt}

        Based on the market context and the bot's strategy configuration above, please provide your analysis.
        Focus on validating if the current market conditions match the strategy's rules and risk parameters.
      `;
    } catch (error) {
      logger.error({
        message: "Error enhancing prompt with bot strategy",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to enhance prompt");
    }
  }

  async validateBotSignal(
    response: string,
    botInstanceId: string
  ): Promise<{
    isValid: boolean;
    refinedResponse: string;
    compliance: Record<string, any>;
  }> {
    try {
      // Get bot instance with its strategy
      const botInstance = await prisma.botInstance.findUnique({
        where: { id: botInstanceId },
        include: {
          strategy: true,
        },
      });

      if (!botInstance) {
        throw new Error("Bot instance not found");
      }

      // Create validation prompt
      const validationPrompt = `
        Original Analysis:
        ${response}

        Strategy Rules:
        ${JSON.stringify(botInstance.strategy.rules)}

        Risk Settings:
        ${JSON.stringify(botInstance.riskSettings)}

        Please validate if the analysis complies with the strategy rules and risk settings.
        Return a JSON response with:
        - isValid: boolean
        - reason: string
        - compliance: object with rules checked and their status
      `;

      // Get validation from AI model
      const result = await models.analysis.generateContent(validationPrompt);
      const validation = JSON.parse(result.response.text());

      return {
        isValid: validation.isValid,
        refinedResponse: validation.reason,
        compliance: validation.compliance,
      };
    } catch (error) {
      logger.error({
        message: "Error validating bot signal",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new Error("Failed to validate signal");
    }
  }
}
