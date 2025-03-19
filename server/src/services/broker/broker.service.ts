import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { BrokerCredential, Prisma } from "@prisma/client";
import { CapitalComAPI } from "./capital-com/api";
import { encrypt, decrypt, encryptCredentials, decryptCredentials } from "../../utils/encryption.utils";
import { BrokerConnection, BrokerCredentials } from "../../types/broker";

const logger = createLogger("broker-service");

interface CredentialData {
  apiKey: string;
  identifier: string;
  password: string;
}

export class BrokerService {
  private readonly brokerAPIs: Map<string, any> = new Map([["capital.com", CapitalComAPI]]);

  getBrokerAPI(brokerName: string) {
    const normalizedBrokerName = brokerName.toLowerCase().replace(/_/g, ".");
    return this.brokerAPIs.get(normalizedBrokerName);
  }

  getDecryptedCredentials(connection: BrokerCredential) {
    try {
      console.log(`Decrypting credentials for connection: ${connection.id}, broker: ${connection.broker_name}`);
      const credentials = connection.credentials as Record<string, string>;

      if (!credentials || typeof credentials !== "object") {
        console.error("Invalid credentials format", { credentialsType: typeof credentials });
        throw new Error("Invalid credentials format");
      }

      console.log("Credential keys available:", Object.keys(credentials));

      return {
        apiKey: decrypt(credentials.apiKey || ""),
        identifier: decrypt(credentials.identifier || ""),
        password: decrypt(credentials.password || ""),
      };
    } catch (error) {
      console.error("Error decrypting credentials:", error instanceof Error ? error.message : "Unknown error");
      throw new Error(`Failed to decrypt credentials: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

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

  async addConnection(userId: string, brokerName: string, credentials: CredentialData, description: string = "", isDemo: boolean = false) {
    try {
      logger.info(`Adding ${brokerName} connection for user ${userId}`);

      // Encrypt credentials
      const encryptedCredentials = await encryptCredentials(credentials);

      // Create connection in database
      const connection = await prisma.brokerCredential.create({
        data: {
          user_id: userId,
          broker_name: brokerName,
          description,
          is_active: true,
          is_demo: isDemo, // Save is_demo field
          credentials: encryptedCredentials as any,
        },
      });

      // Return connection without raw credentials
      return this.mapToBrokerConnection(connection);
    } catch (error) {
      logger.error("Error adding broker connection:", error);
      throw new Error("Failed to add broker connection");
    }
  }

  async getConnections(userId: string) {
    try {
      const connections = await prisma.brokerCredential.findMany({
        where: {
          user_id: userId,
        },
        select: {
          id: true,
          broker_name: true,
          description: true,
          is_active: true,
          created_at: true,
          last_used: true,
        },
      });

      return connections;
    } catch (error) {
      logger.error("Error fetching broker connections:", error);
      throw new Error("Failed to fetch broker connections");
    }
  }

  async updateConnection(userId: string, connectionId: string, updates: any) {
    try {
      logger.info(`Updating connection ${connectionId} for user ${userId}`);

      // Get existing connection
      const existingConnection = await prisma.brokerCredential.findFirst({
        where: {
          id: connectionId,
          user_id: userId,
        },
      });

      if (!existingConnection) {
        throw new Error("Connection not found");
      }

      const updateData: any = {};

      // Handle description update
      if (updates.description !== undefined) {
        updateData.description = updates.description;
      }

      // Handle is_active update
      if (updates.is_active !== undefined) {
        updateData.is_active = updates.is_active;
      }

      // Handle is_demo update
      if (updates.is_demo !== undefined) {
        updateData.is_demo = updates.is_demo;
      }

      // Handle credentials update
      if (updates.credentials) {
        // Get existing credentials
        const decryptedCredentials = await decryptCredentials(existingConnection.credentials as any);

        // Merge with updates
        const updatedCredentials = {
          apiKey: updates.credentials.apiKey || decryptedCredentials.apiKey,
          identifier: updates.credentials.identifier || decryptedCredentials.identifier,
          password: updates.credentials.password || decryptedCredentials.password,
        };

        // Encrypt the updated credentials
        updateData.credentials = await encryptCredentials(updatedCredentials);
      }

      // Update the connection
      const updatedConnection = await prisma.brokerCredential.update({
        where: {
          id: connectionId,
        },
        data: updateData,
      });

      return this.mapToBrokerConnection(updatedConnection);
    } catch (error) {
      logger.error("Error updating broker connection:", error);
      throw new Error("Failed to update broker connection");
    }
  }

  async deleteConnection(userId: string, connectionId: string) {
    try {
      const connection = await prisma.brokerCredential.findFirst({
        where: {
          id: connectionId,
          user_id: userId,
        },
      });

      if (!connection) {
        throw new Error("Broker connection not found");
      }

      await prisma.brokerCredential.delete({
        where: {
          id: connectionId,
        },
      });

      return true;
    } catch (error) {
      logger.error("Error deleting broker connection:", error);
      throw new Error("Failed to delete broker connection");
    }
  }

  async validateConnection(connectionId: string) {
    try {
      const credential = await prisma.brokerCredential.findUnique({
        where: {
          id: connectionId,
        },
      });

      if (!credential) {
        throw new Error("Broker connection not found");
      }

      // Decrypt credentials
      const decryptedCredentials = JSON.parse(decrypt(credential.credentials));

      // Based on broker type, validate credentials
      if (credential.broker_name === "capital.com" || credential.broker_name.toLowerCase() === "capital_com") {
        const api = new CapitalComAPI(decryptedCredentials.apiKey, decryptedCredentials.identifier, decryptedCredentials.password);

        // Use a simple API call to validate
        await api.getClientInfo();

        // Update last_used timestamp
        await prisma.brokerCredential.update({
          where: {
            id: connectionId,
          },
          data: {
            last_used: new Date(),
          },
        });

        return true;
      }

      throw new Error("Unsupported broker");
    } catch (error) {
      logger.error("Error validating broker connection:", error);
      return false;
    }
  }

  async getUserCredential(userId: string, credentialId: string) {
    try {
      const credential = await prisma.brokerCredential.findFirst({
        where: {
          id: credentialId,
          user_id: userId,
        },
      });

      if (!credential) {
        throw new Error("Broker credential not found");
      }

      // Update last_used timestamp
      await prisma.brokerCredential.update({
        where: {
          id: credentialId,
        },
        data: {
          last_used: new Date(),
        },
      });

      return credential;
    } catch (error) {
      logger.error("Error getting user credential:", error);
      throw new Error("Failed to get broker credential");
    }
  }

  async getAccountBalance(credentialId: string): Promise<number> {
    try {
      const credential = await prisma.brokerCredential.findUnique({
        where: {
          id: credentialId,
        },
      });

      if (!credential) {
        throw new Error("Broker credential not found");
      }

      // Decrypt credentials
      const decryptedCredentials = JSON.parse(decrypt(credential.credentials));

      // Based on broker type, get balance
      if (credential.broker_name === "capital.com" || credential.broker_name.toLowerCase() === "capital_com") {
        const api = new CapitalComAPI(decryptedCredentials.apiKey, decryptedCredentials.identifier, decryptedCredentials.password);

        const account = await api.getClientInfo();
        return account.balance;
      }

      // Mock balance for testing if no balance is available
      return 10000;
    } catch (error) {
      logger.error("Error getting account balance:", error);
      // Return mock balance if error
      return 10000;
    }
  }

  async getCurrentPrice(pair: string): Promise<number> {
    try {
      // Try to get price from database first for common pairs
      const storedPair = await prisma.capitalComPair.findUnique({
        where: {
          symbol: pair,
        },
      });

      if (storedPair) {
        // This is just a mock price for now since we don't store real-time prices in DB
        // In a production app, you'd need to call an API for real-time prices
        return 1.2345; // Mock price
      }

      // Return mock price if not found
      return 1.2345;
    } catch (error) {
      logger.error("Error getting current price:", error);
      return 1.2345; // Mock price
    }
  }

  async placeOrder(
    credentialId: string,
    pair: string,
    side: "BUY" | "SELL",
    quantity: number,
    orderType: "MARKET" | "LIMIT" = "MARKET",
    limitPrice?: number,
    stopLoss?: number,
    takeProfit?: number
  ): Promise<any> {
    try {
      const credential = await prisma.brokerCredential.findUnique({
        where: {
          id: credentialId,
        },
      });

      if (!credential) {
        throw new Error("Broker credential not found");
      }

      // For now, return a mock order since we don't have an actual broker API integrated
      const mockOrderId = `order-${Date.now()}`;

      logger.info(`Mock order placed: ${side} ${quantity} ${pair} at ${limitPrice || "market price"}`);

      return {
        id: mockOrderId,
        side,
        pair,
        quantity,
        type: orderType,
        price: limitPrice || (await this.getCurrentPrice(pair)),
        stopLoss,
        takeProfit,
        status: "FILLED", // For market orders
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error placing order:", error);
      throw new Error("Failed to place order");
    }
  }

  async closePosition(tradeId: string): Promise<boolean> {
    try {
      // In a real implementation, this would call the broker API to close the position
      logger.info(`Mock closing position: ${tradeId}`);
      return true;
    } catch (error) {
      logger.error("Error closing position:", error);
      throw new Error("Failed to close position");
    }
  }
}
