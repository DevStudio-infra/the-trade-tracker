import { api } from "./api";

export interface BrokerCredentials {
  id: string;
  broker_name: string;
  is_active: boolean;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
  };
  last_used?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  broker_credentials: BrokerCredentials[];
}

export interface UpdateUserSettingsData {
  name?: string;
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
