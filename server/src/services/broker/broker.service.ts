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
      message: "Mapping broker connection - Start",
      connectionId: connection.id,
      broker_name: connection.broker_name,
      credentials_check: {
        exists: !!connection.credentials,
        type: typeof connection.credentials,
        isObject: typeof connection.credentials === "object",
        hasApiKey: !!(connection.credentials as any)?.apiKey,
        hasIdentifier: !!(connection.credentials as any)?.identifier,
        hasPassword: !!(connection.credentials as any)?.password,
        apiKeyLength: (connection.credentials as any)?.apiKey?.length,
        identifierLength: (connection.credentials as any)?.identifier?.length,
        passwordLength: (connection.credentials as any)?.password?.length,
      },
    });

    // Handle credentials decryption
    let decryptedCredentials: BrokerCredentials;

    try {
      const credentials = connection.credentials as Record<string, string>;
      logger.info({
        message: "Attempting to decrypt credentials",
        fields_to_decrypt: {
          apiKey: {
            exists: !!credentials.apiKey,
            length: credentials.apiKey?.length,
          },
          identifier: {
            exists: !!credentials.identifier,
            length: credentials.identifier?.length,
          },
          password: {
            exists: !!credentials.password,
            length: credentials.password?.length,
          },
        },
      });

      decryptedCredentials = {
        apiKey: credentials.apiKey ? decrypt(credentials.apiKey) : "",
        identifier: credentials.identifier ? decrypt(credentials.identifier) : "",
        password: credentials.password ? decrypt(credentials.password) : "",
      };

      logger.info({
        message: "Credentials decrypted successfully",
        decrypted_lengths: {
          apiKey: decryptedCredentials.apiKey.length,
          identifier: decryptedCredentials.identifier.length,
          password: decryptedCredentials.password.length,
        },
      });
    } catch (error) {
      logger.error({
        message: "Error decrypting credentials",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        connectionId: connection.id,
        credentials_type: typeof connection.credentials,
      });
      // Fallback to empty credentials if decryption fails
      decryptedCredentials = {
        apiKey: "",
        identifier: "",
        password: "",
      };
    }

    return {
      id: connection.id,
      user_id: connection.user_id,
      broker_name: connection.broker_name,
      description: connection.description,
      credentials: decryptedCredentials,
      is_active: connection.is_active,
      last_used: connection.last_used,
      created_at: connection.created_at,
      updated_at: connection.updated_at,
    };
  }

  async addConnection(userId: string, brokerName: string, credentials: BrokerCredentials, description: string): Promise<BrokerConnection> {
    const normalizedBrokerName = brokerName.toLowerCase().replace(/_/g, ".");
    const BrokerAPI = this.brokerAPIs.get(normalizedBrokerName);

    if (!BrokerAPI) {
      throw new Error("Unsupported broker");
    }

    try {
      // Validate credentials
      if (!credentials.apiKey || !credentials.identifier || !credentials.password) {
        throw new Error("Missing required credentials");
      }

      const api = new BrokerAPI(credentials.apiKey, credentials.identifier, credentials.password);
      await api.validateCredentials();

      logger.info({
        message: "Adding broker connection - Initial credentials",
        userId,
        brokerName: normalizedBrokerName,
        credentials_check: {
          apiKey: {
            exists: !!credentials.apiKey,
            length: credentials.apiKey?.length,
          },
          identifier: {
            exists: !!credentials.identifier,
            length: credentials.identifier?.length,
          },
          password: {
            exists: !!credentials.password,
            length: credentials.password?.length,
          },
        },
      });

      // Create a clean credentials object with only the required fields
      const cleanCredentials = {
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
      };

      logger.info({
        message: "Clean credentials prepared",
        has_fields: {
          apiKey: !!cleanCredentials.apiKey,
          identifier: !!cleanCredentials.identifier,
          password: !!cleanCredentials.password,
        },
      });

      // Encrypt each field individually
      const encryptedCredentials = {
        apiKey: encrypt(cleanCredentials.apiKey),
        identifier: encrypt(cleanCredentials.identifier),
        password: encrypt(cleanCredentials.password),
      };

      logger.info({
        message: "Credentials encrypted",
        encrypted_lengths: {
          apiKey: encryptedCredentials.apiKey?.length,
          identifier: encryptedCredentials.identifier?.length,
          password: encryptedCredentials.password?.length,
        },
      });

      const connection = await prisma.brokerCredential.create({
        data: {
          user_id: userId,
          broker_name: normalizedBrokerName,
          description: description || `${normalizedBrokerName} Connection`,
          credentials: encryptedCredentials,
          is_active: true,
        },
      });

      logger.info({
        message: "Created broker connection",
        connectionId: connection.id,
        credentials_type: typeof connection.credentials,
        credentials_check: {
          isObject: typeof connection.credentials === "object",
          hasApiKey: !!(connection.credentials as any)?.apiKey,
          hasIdentifier: !!(connection.credentials as any)?.identifier,
          hasPassword: !!(connection.credentials as any)?.password,
          apiKeyLength: (connection.credentials as any)?.apiKey?.length,
          identifierLength: (connection.credentials as any)?.identifier?.length,
          passwordLength: (connection.credentials as any)?.password?.length,
        },
      });

      return this.mapToBrokerConnection(connection);
    } catch (error) {
      logger.error({
        message: "Error adding broker connection",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        brokerName: normalizedBrokerName,
      });
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
