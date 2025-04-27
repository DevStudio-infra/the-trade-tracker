// credential.service.ts
// Handles secure storage and retrieval of broker credentials
import { prisma } from "../../lib/prisma";
import { encrypt, decrypt } from "../../utils/encryption.utils";

export interface BrokerCredentialInput {
  userId: string;
  brokerName: string;
  apiKey: string;
  identifier: string;
  password: string;
  isDemo: boolean;
  description?: string;
}

export interface BrokerCredential {
  id: string;
  userId: string;
  brokerName: string;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    isDemo: boolean;
  };
  description?: string;
  createdAt: Date;
}

/**
 * Save broker credentials securely (encrypt as single string)
 */
export async function saveBrokerCredential(input: BrokerCredentialInput): Promise<BrokerCredential> {
  const { userId, brokerName, apiKey, identifier, password, isDemo, description } = input;
  const credentialsObj = { apiKey, identifier, password, isDemo };
  const encrypted = encrypt(JSON.stringify(credentialsObj));

  const record = await prisma.brokerCredential.create({
    data: {
      user_id: userId,
      broker_name: brokerName,
      credentials: encrypted,
      is_demo: isDemo,
      description,
    },
  });

  return {
    id: record.id,
    userId: record.user_id,
    brokerName: record.broker_name,
    credentials: credentialsObj,
    description: record.description,
    createdAt: record.created_at,
  };
}

/**
 * Retrieve and decrypt broker credentials
 */
export async function getBrokerCredential(userId: string, brokerName: string): Promise<BrokerCredential | null> {
  const record = await prisma.brokerCredential.findFirst({
    where: {
      user_id: userId,
      broker_name: brokerName,
      is_active: true,
    },
  });
  if (!record) return null;
  const decrypted = JSON.parse(decrypt(record.credentials));
  return {
    id: record.id,
    userId: record.user_id,
    brokerName: record.broker_name,
    credentials: decrypted,
    description: record.description,
    createdAt: record.created_at,
  };
}
