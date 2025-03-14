import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerCredential, Prisma } from "@prisma/client";
import { CapitalComAPI } from "./capital-com/api";
import { encrypt, decrypt, encryptCredentials, decryptCredentials } from "../../utils/encryption.utils";
import { BrokerConnection, BrokerCredentials } from "../../types/broker";

const logger = createLogger("broker-service");

export class BrokerService {
  private readonly brokerAPIs: Map<string, any> = new Map([["capital.com", CapitalComAPI]]);

  private mapToBrokerConnection(connection: BrokerCredential): BrokerConnection {
    logger.info({
      message: "Mapping broker connection to response",
      connectionId: connection.id,
      broker_name: connection.broker_name,
      has_credentials: !!connection.credentials,
    });

    const decryptedCredentials = decryptCredentials<BrokerCredentials>(connection.credentials as Record<string, string>);

    logger.info({
      message: "Decrypted credentials",
      connectionId: connection.id,
      has_decrypted: {
        apiKey: !!decryptedCredentials.apiKey,
        identifier: !!decryptedCredentials.identifier,
        password: !!decryptedCredentials.password,
      },
    });

    return {
      id: connection.id,
      user_id: connection.user_id,
      broker_name: connection.broker_name,
      credentials: decryptedCredentials,
      is_active: connection.is_active,
      last_used: connection.last_used,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
    };
  }

  async addConnection(userId: string, brokerName: string, credentials: BrokerCredentials): Promise<BrokerConnection> {
    const normalizedBrokerName = brokerName.toLowerCase().replace(/_/g, ".");
    const BrokerAPI = this.brokerAPIs.get(normalizedBrokerName);

    if (!BrokerAPI) {
      throw new Error("Unsupported broker");
    }

    try {
      const api = new BrokerAPI(credentials.apiKey, credentials.identifier, credentials.password);
      await api.validateCredentials();

      const encryptedCredentials = encryptCredentials(credentials);

      const connection = await prisma.brokerCredential.create({
        data: {
          user_id: userId,
          broker_name: normalizedBrokerName,
          credentials: encryptedCredentials as Prisma.InputJsonValue,
          is_active: true,
        },
      });

      return this.mapToBrokerConnection(connection);
    } catch (error) {
      logger.error("Error adding broker connection:", error);
      throw error;
    }
  }

  async getConnections(userId: string): Promise<BrokerConnection[]> {
    try {
      const connections = await prisma.brokerCredential.findMany({
        where: { user_id: userId },
      });

      return connections.map((connection) => this.mapToBrokerConnection(connection));
    } catch (error) {
      logger.error({
        message: "Error fetching broker connections",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      throw error;
    }
  }

  async updateConnection(userId: string, connectionId: string, updates: { is_active?: boolean; credentials?: BrokerCredentials }): Promise<BrokerConnection> {
    try {
      const updateData: Prisma.BrokerCredentialUpdateInput = {
        is_active: updates.is_active,
      };

      if (updates.credentials) {
        const encryptedCredentials = encryptCredentials(updates.credentials);
        updateData.credentials = encryptedCredentials as Prisma.InputJsonValue;
      }

      const connection = await prisma.brokerCredential.update({
        where: {
          id: connectionId,
          user_id: userId,
        },
        data: updateData,
      });

      return this.mapToBrokerConnection(connection);
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

      const credentials = decryptCredentials<BrokerCredentials>(connection.credentials as Record<string, string>);
      const api = new BrokerAPI(credentials.apiKey, credentials.identifier, credentials.password);
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
