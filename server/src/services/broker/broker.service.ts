import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerCredential } from "@prisma/client";
import { CapitalComAPI } from "./capital-com/api";
import { encryptCredentials, decryptCredentials } from "../../utils/encryption.utils";

const logger = createLogger("broker-service");

interface BrokerConnection {
  id: string;
  broker_name: string;
  is_active: boolean;
  is_demo: boolean;
  last_used: Date | null;
  metadata: any;
  user_id: string;
  credentials: any;
  created_at: Date;
  updated_at: Date;
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
          user_id: userId,
          broker_name: brokerName,
          credentials: encryptedCredentials,
          is_demo: credentials.isDemo || false,
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
          broker_name: true,
          is_active: true,
          is_demo: true,
          last_used: true,
          metadata: true,
          user_id: true,
          credentials: true,
          created_at: true,
          updated_at: true,
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
        where: { user_id: userId },
        select: {
          id: true,
          broker_name: true,
          is_active: true,
          is_demo: true,
          last_used: true,
          metadata: true,
          user_id: true,
          credentials: true,
          created_at: true,
          updated_at: true,
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

  async updateConnection(userId: string, connectionId: string, updates: Partial<{ is_active: boolean; is_demo: boolean }>): Promise<BrokerConnection> {
    try {
      const connection = await prisma.brokerCredential.update({
        where: {
          id: connectionId,
          user_id: userId, // Ensure the connection belongs to the user
        },
        data: updates,
        select: {
          id: true,
          broker_name: true,
          is_active: true,
          is_demo: true,
          last_used: true,
          metadata: true,
          user_id: true,
          credentials: true,
          created_at: true,
          updated_at: true,
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
          user_id: userId, // Ensure the connection belongs to the user
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

      const BrokerAPI = this.brokerAPIs.get(connection.broker_name);
      if (!BrokerAPI) {
        throw new Error("Unsupported broker");
      }

      const credentials = decryptCredentials<BrokerCredentials>(connection.credentials as string);
      const api = new BrokerAPI(credentials.apiKey, credentials.apiSecret);
      await api.validateCredentials();

      // Update last used timestamp
      await prisma.brokerCredential.update({
        where: { id: connectionId },
        data: { last_used: new Date() },
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
