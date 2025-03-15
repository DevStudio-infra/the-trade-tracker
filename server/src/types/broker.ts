import { Prisma } from "@prisma/client";

export interface BrokerCredentials {
  apiKey: string;
  identifier: string;
  password: string;
  [key: string]: string;
}

export interface BrokerConnection {
  id: string;
  user_id: string;
  broker_name: string;
  description: string;
  credentials: BrokerCredentials;
  is_active: boolean;
  last_used: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BrokerConnectionRequest {
  broker_name: string;
  description: string;
  credentials: BrokerCredentials;
}
