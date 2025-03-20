import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useAuth } from "@clerk/nextjs";

interface BrokerCredentials {
  api_key: string;
  identifier: string;
  password?: string;
  additional_fields?: Record<string, string>;
}

export function useSettings() {
  const queryClient = useQueryClient();
  const api = useApi();
  const { userId } = useAuth();

  // Fetch user profile
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      try {
        console.log("Fetching user profile...");
        const response = await api.getUserProfile();
        console.log("User profile response:", response);
        return response;
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error("Error fetching user profile:", {
          error: axiosError,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });

        // If user doesn't exist (404) and we have a userId, try to create the user
        if (axiosError.response?.status === 404 && userId) {
          try {
            console.log("Attempting to create user...");
            const newUser = await api.createUser();
            console.log("User created successfully:", newUser);
            return newUser;
          } catch (createError) {
            console.error("Error creating user:", createError);
            throw createError;
          }
        }

        throw error;
      }
    },
    retry: false,
  });

  // Fetch broker connections
  const {
    data: brokerConnections,
    isLoading: isLoadingBrokers,
    error: brokerError,
    refetch: refetchBrokerConnections,
  } = useQuery({
    queryKey: ["broker-connections"],
    queryFn: async () => {
      try {
        console.log("Fetching broker connections...");

        // Add a small delay to ensure other API calls have completed
        // This helps avoid race conditions when multiple API calls are made in quick succession
        await new Promise((resolve) => setTimeout(resolve, 300));

        const response = await api.getBrokerConnections();
        console.log("Broker connections response:", response);

        if (!Array.isArray(response)) {
          console.error("Unexpected response format for broker connections:", response);
          throw new Error("Unexpected response format for broker connections");
        }

        return response;
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error("Error fetching broker connections:", {
          error: axiosError,
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message,
          stack: axiosError.stack,
        });

        // Check if it's an authentication error
        if (axiosError.response?.status === 401) {
          console.log("Authentication error when fetching broker connections, user may need to log in again");
          // We could add code here to redirect to login or refresh token
        }

        throw error;
      }
    },
    retry: 2, // Retry twice before failing
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
    enabled: !!profile, // Don't run this query until we have a profile
    // Increased stale time to avoid too many refreshes
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Update broker connection
  const updateBrokerConnection = useMutation({
    mutationFn: (data: { broker: string; credentials: BrokerCredentials; is_demo: boolean }) =>
      api.connectBroker(data.broker, {
        broker_name: data.broker,
        credentials: {
          apiKey: data.credentials.api_key,
          identifier: data.credentials.identifier,
          password: data.credentials.password || "",
        },
        description: `${data.broker} ${data.is_demo ? "Demo" : "Live"} Account`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-connections"] });
      toast.success("Broker connection updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update broker connection");
      console.error("Update broker error:", error);
    },
  });

  // Delete broker connection
  const deleteBrokerConnection = useMutation({
    mutationFn: (broker: string) =>
      api.connectBroker(broker, {
        broker_name: broker,
        credentials: {
          apiKey: "",
          identifier: "",
          password: "",
        },
        description: "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-connections"] });
      toast.success("Broker connection deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete broker connection");
      console.error("Delete broker error:", error);
    },
  });

  const result = {
    profile,
    brokerConnections,
    isLoadingProfile,
    isLoadingBrokers,
    updateBrokerConnection: updateBrokerConnection.mutate,
    deleteBrokerConnection: deleteBrokerConnection.mutate,
    refetchBrokerConnections,
    errors: {
      profile: profileError,
      broker: brokerError,
    },
  };

  /**
 *

  console.log("useSettings hook result:", {
    ...result,
    hasProfile: !!profile?.data,
    hasBrokerConnections: !!brokerConnections?.data?.connections,
    profileError: profileError
      ? {
          message: (profileError as Error).message,
          status: (profileError as AxiosError).response?.status,
        }
      : null,
    brokerError: brokerError
      ? {
          message: (brokerError as Error).message,
          status: (brokerError as AxiosError).response?.status,
        }
      : null,
  });

 */

  return result;
}
