import { api } from "@/lib/api";

export interface OnboardingStatus {
  onboarding_completed: boolean;
  current_step: number;
}

export interface OnboardingData {
  experience: string;
  tradingStyle: string;
  riskTolerance: string;
  preferredMarkets: string[];
  broker: {
    name: string;
    apiKey: string;
    apiSecret: string;
    isDemo: boolean;
  } | null;
}

export const onboardingService = {
  async getStatus(): Promise<OnboardingStatus> {
    const response = await api.get("/user/onboarding-status");
    return response.data;
  },

  async updateStatus(step: number, completed: boolean, data: OnboardingData): Promise<OnboardingStatus> {
    const response = await api.post("/user/onboarding", {
      step,
      completed,
      data,
    });
    return response.data;
  },
};
