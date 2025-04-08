import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerService } from "../broker/broker.service";
import { RedisService, PositionMetadata } from "../redis/redis.service";

const logger = createLogger("trade-execution-service");

export interface TradeExecutionRequest {
  userId: string;
  signalId: string;
  credentialId: string;
  riskPercent: number;
}

export interface PositionSizeCalculation {
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  entryPrice: number;
  potentialLoss: number;
  potentialProfit: number;
  riskRewardRatio: number;
}

export interface TradePosition {
  tradeId: string;
  pair: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  openTime: string;
}

export class TradeExecutionService {
  private brokerService: BrokerService;
  private redisService: RedisService;

  constructor() {
    this.brokerService = new BrokerService();
    this.redisService = new RedisService();
  }

  /**
   * Execute a trade based on a signal
   */
  async executeTrade(request: TradeExecutionRequest): Promise<any> {
    const { userId, signalId, credentialId, riskPercent } = request;

    try {
      // 1. Get the signal details
      const signal = await prisma.signal.findUnique({
        where: { id: signalId },
        include: {
          botInstance: {
            include: {
              strategy: true,
            },
          },
        },
      });

      if (!signal) {
        throw new Error(`Signal not found: ${signalId}`);
      }

      // 2. Check if signal is already executed
      if (signal.executedAt || signal.tradeId) {
        throw new Error(`Signal already executed: ${signalId}`);
      }

      // 3. Verify user has permission to execute this signal
      if (signal.userId !== userId) {
        throw new Error("Unauthorized: Signal belongs to another user");
      }

      // 4. Get broker credential
      const brokerCredential = await this.brokerService.getUserCredential(userId, credentialId);

      if (!brokerCredential) {
        throw new Error(`Broker credential not found: ${credentialId}`);
      }

      // 5. Calculate position size based on risk
      const positionSize = await this.calculatePositionSize(
        brokerCredential.id,
        signal.pair,
        signal.signalType as "BUY" | "SELL",
        parseFloat(signal.stopLoss.toString()),
        parseFloat(signal.takeProfit.toString()),
        riskPercent
      );

      // 6. Execute the trade with the broker API
      const orderResult = await this.brokerService.placeOrder(
        brokerCredential.id,
        signal.pair,
        signal.signalType as "BUY" | "SELL",
        positionSize.quantity,
        "MARKET",
        undefined, // No limit price for market orders
        positionSize.stopLoss,
        positionSize.takeProfit
      );

      // 7. Create a trade record in the database
      const trade = await prisma.trade.create({
        data: {
          id: orderResult.id || `trade-${Date.now()}`, // Use broker's order ID if available
          userId: userId,
          botInstanceId: signal.botInstanceId,
          signalId: signal.id,
          pair: signal.pair,
          entryPrice: positionSize.entryPrice,
          quantity: positionSize.quantity,
          riskPercent: riskPercent,
          riskReward: positionSize.riskRewardRatio,
          metadata: {
            orderResult: JSON.parse(JSON.stringify(orderResult)),
            strategy: signal.botInstance.strategy.name,
            positionCalculation: JSON.parse(JSON.stringify(positionSize)),
          },
          createdAt: new Date(),
        },
      });

      // 8. Update the signal as executed
      await prisma.signal.update({
        where: { id: signalId },
        data: {
          executedAt: new Date(),
          tradeId: trade.id,
          status: "EXECUTED",
        },
      });

      // 9. Store position metadata
      const metadata: PositionMetadata = {
        positionCalculation: positionSize,
        orderResult,
      };
      await this.redisService.setPositionMetadata(trade.id, metadata);

      // 10. Add to active positions cache
      const position: TradePosition = {
        tradeId: trade.id,
        pair: signal.pair,
        side: signal.signalType as "BUY" | "SELL",
        entryPrice: positionSize.entryPrice,
        stopLoss: positionSize.stopLoss,
        takeProfit: positionSize.takeProfit,
        quantity: positionSize.quantity,
        openTime: new Date().toISOString(),
      };
      await this.redisService.setActivePosition(trade.id, position);

      logger.info({
        message: "Trade executed successfully",
        userId,
        signalId,
        tradeId: trade.id,
        pair: signal.pair,
      });

      return {
        tradeId: trade.id,
        pair: signal.pair,
        side: signal.signalType,
        entryPrice: positionSize.entryPrice,
        stopLoss: positionSize.stopLoss,
        takeProfit: positionSize.takeProfit,
        quantity: positionSize.quantity,
        status: "OPEN",
        createdAt: trade.createdAt,
      };
    } catch (error) {
      logger.error({
        message: "Error executing trade",
        userId,
        signalId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Close an open position
   */
  async closePosition(userId: string, tradeId: string): Promise<any> {
    try {
      // 1. Check if the trade exists and belongs to the user
      const trade = await prisma.trade.findFirst({
        where: {
          id: tradeId,
          userId,
          closedAt: null, // Must be open
        },
      });

      if (!trade) {
        throw new Error(`Trade not found or already closed: ${tradeId}`);
      }

      // 2. Get the current market price
      const currentPrice = await this.brokerService.getCurrentPrice(trade.pair);

      // 3. Calculate profit/loss
      const metadata = await this.redisService.getPositionMetadata(tradeId);
      if (!metadata?.orderResult) {
        throw new Error(`No order metadata found for trade: ${tradeId}`);
      }

      const isLong = metadata.orderResult.side === "BUY";
      const entryPrice = parseFloat(trade.entryPrice.toString());
      const quantity = parseFloat(trade.quantity.toString());
      const priceDifference = isLong ? currentPrice - entryPrice : entryPrice - currentPrice;
      const profitLoss = priceDifference * quantity;

      // 4. Close the position with the broker
      await this.brokerService.closePosition(trade.id);

      // 5. Update the trade record
      await prisma.trade.update({
        where: { id: tradeId },
        data: {
          closedAt: new Date(),
          exitPrice: currentPrice,
          profitLoss,
        },
      });

      // 6. Remove from active positions and metadata
      await this.redisService.removeActivePosition(tradeId);
      await this.redisService.removePositionMetadata(tradeId);

      return {
        tradeId,
        exitPrice: currentPrice,
        profitLoss,
        status: "CLOSED",
      };
    } catch (error) {
      logger.error({
        message: "Error closing position",
        userId,
        tradeId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Calculate position size based on risk percentage
   */
  async calculatePositionSize(
    credentialId: string,
    pair: string,
    side: "BUY" | "SELL",
    stopLoss: number,
    takeProfit: number,
    riskPercent: number
  ): Promise<PositionSizeCalculation> {
    try {
      // 1. Get account balance
      const balance = await this.brokerService.getAccountBalance(credentialId);

      // 2. Get current market price
      const currentPrice = await this.brokerService.getCurrentPrice(pair);

      // 3. Calculate risk amount in account currency
      const riskAmount = (balance * riskPercent) / 100;

      // 4. Calculate pip value and risk per pip
      const pipRisk = Math.abs(currentPrice - stopLoss);

      // 5. Calculate position size based on risk
      const quantity = riskAmount / pipRisk;

      // 6. Calculate potential profit and loss
      const potentialLoss = quantity * Math.abs(currentPrice - stopLoss);
      const potentialProfit = quantity * Math.abs(takeProfit - currentPrice);
      const riskRewardRatio = potentialProfit / potentialLoss;

      return {
        quantity,
        stopLoss,
        takeProfit,
        entryPrice: currentPrice,
        potentialLoss,
        potentialProfit,
        riskRewardRatio,
      };
    } catch (error) {
      logger.error({
        message: "Error calculating position size",
        pair,
        riskPercent,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Get all open positions for a user
   */
  async getOpenPositions(userId: string): Promise<TradePosition[]> {
    try {
      const positions = await this.redisService.getActivePositions();
      return Object.values(positions) as TradePosition[];
    } catch (error) {
      logger.error({
        message: "Error getting open positions",
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }
}
