import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerCredential } from "@prisma/client";
import { CapitalComAPI } from "./capital-com/api";
import { encryptCredentials, decryptCredentials } from "../../utils/encryption.utils";

const logger = createLogger("broker-service");

interface BrokerConnection {
  id: string;
  brokerName: string;
  isActive: boolean;
  isDemo: boolean;
  lastUsed: Date | null;
  metadata: any;
}

interface BrokerCredentials {
  apiKey: string;
  apiSecret: string;
  isDemo?: boolean;
}

export class BrokerService {
  private readonly brokerAPIs: Map<string, any> = new Map([["capital", CapitalComAPI]]);

  async addConnection(userId: string, brokerName: string, credentials: BrokerCredentials): Promise<BrokerConnection> {
    try {
      // Validate broker exists
      if (!this.brokerAPIs.has(brokerName)) {
        throw new Error("Unsupported broker");
      }

      // Validate API credentials
      const BrokerAPI = this.brokerAPIs.get(brokerName);
      const api = new BrokerAPI(credentials.apiKey, credentials.apiSecret);
      await api.validateCredentials();

      // Store encrypted credentials
      const encryptedCredentials = encryptCredentials(credentials);
      const connection = await prisma.brokerCredential.create({
        data: {
          userId,
          brokerName,
          credentials: encryptedCredentials,
          isDemo: credentials.isDemo || false,
          metadata: {
            createdAt: new Date(),
            settings: {
              leverage: "1:30",
              defaultLotSize: "0.01",
            },
          },
        },
        select: {
          id: true,
          brokerName: true,
          isActive: true,
          isDemo: true,
          lastUsed: true,
          metadata: true,
        },
      });

      logger.info({
        message: "Broker connection added",
        userId,
        brokerName,
        connectionId: connection.id,
      });

      return connection;
    } catch (error) {
      logger.error({
        message: "Error adding broker connection",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        brokerName,
      });
      throw error;
    }
  }

  async getConnections(userId: string): Promise<BrokerConnection[]> {
    try {
      const connections = await prisma.brokerCredential.findMany({
        where: { userId },
        select: {
          id: true,
          brokerName: true,
          isActive: true,
          isDemo: true,
          lastUsed: true,
          metadata: true,
        },
      });

      return connections;
    } catch (error) {
      logger.error({
        message: "Error fetching broker connections",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      throw error;
    }
  }

  async updateConnection(userId: string, connectionId: string, updates: Partial<{ isActive: boolean; isDemo: boolean }>): Promise<BrokerConnection> {
    try {
      const connection = await prisma.brokerCredential.update({
        where: {
          id: connectionId,
          userId, // Ensure the connection belongs to the user
        },
        data: updates,
        select: {
          id: true,
          brokerName: true,
          isActive: true,
          isDemo: true,
          lastUsed: true,
          metadata: true,
        },
      });

      logger.info({
        message: "Broker connection updated",
        userId,
        connectionId,
        updates,
      });

      return connection;
    } catch (error) {
      logger.error({
        message: "Error updating broker connection",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        connectionId,
      });
      throw error;
    }
  }

  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    try {
      await prisma.brokerCredential.delete({
        where: {
          id: connectionId,
          userId, // Ensure the connection belongs to the user
        },
      });

      logger.info({
        message: "Broker connection deleted",
        userId,
        connectionId,
      });
    } catch (error) {
      logger.error({
        message: "Error deleting broker connection",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        connectionId,
      });
      throw error;
    }
  }

  async validateConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = await prisma.brokerCredential.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        throw new Error("Connection not found");
      }

      const BrokerAPI = this.brokerAPIs.get(connection.brokerName);
      if (!BrokerAPI) {
        throw new Error("Unsupported broker");
      }

      const credentials = decryptCredentials<BrokerCredentials>(connection.credentials as string);
      const api = new BrokerAPI(credentials.apiKey, credentials.apiSecret);
      await api.validateCredentials();

      // Update last used timestamp
      await prisma.brokerCredential.update({
        where: { id: connectionId },
        data: { lastUsed: new Date() },
      });

      return true;
    } catch (error) {
      logger.error({
        message: "Error validating broker connection",
        error: error instanceof Error ? error.message : "Unknown error",
        connectionId,
      });
      return false;
    }
  }
}
