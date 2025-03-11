import { api } from "./api";

export interface BrokerCredentials {
  id: string;
  broker_name: string;
  is_demo: boolean;
  credentials: Record<string, string>;
  metadata: {
    created_at: string;
    settings: {
      leverage: string;
      default_lot_size: string;
    };
  };
}

export interface UserSettings {
  id: string;
  email: string;
  subscription_plan: string;
  credits: number;
  is_active: boolean;
  broker_credentials: BrokerCredentials[];
}

export interface UpdateUserSettingsData {
  subscription_plan?: string;
  is_active?: boolean;
}

export const settingsApi = {
  // Get user settings
  getUserSettings: async (): Promise<UserSettings> => {
    try {
      const fullUrl = api.defaults.baseURL + "/user/settings";
      console.log("Requesting user settings from:", fullUrl);
      const response = await api.get("/user/settings");
      return response.data;
    } catch (error) {
      console.error("Error fetching user settings:", error);
      throw error;
    }
  },

  // Update user settings
  updateUserSettings: async (data: UpdateUserSettingsData): Promise<UserSettings> => {
    try {
      console.log("Updating user settings at:", api.defaults.baseURL + "/user/settings", "with data:", data);
      const response = await api.patch("/user/settings", data);
      return response.data;
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw error;
    }
  },
};
