import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api";
import { toast } from "sonner";

interface BrokerCredentials {
  api_key: string;
  identifier: string;
  password?: string;
  additional_fields?: Record<string, string>;
}

export function useSettings() {
  const queryClient = useQueryClient();
  const api = useApi();

  // Fetch user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await api.getUserProfile();
      return { data: response };
    },
  });

  // Fetch broker connections
  const { data: brokerConnections, isLoading: isLoadingBrokers } = useQuery({
    queryKey: ["broker-connections"],
    queryFn: async () => {
      const response = await api.getBrokerConnections();
      return { data: { connections: response } };
    },
  });

  // Update broker connection
  const updateBrokerConnection = useMutation({
    mutationFn: (data: { broker: string; credentials: BrokerCredentials; is_demo: boolean }) =>
      api.connectBroker(data.broker, {
        apiKey: data.credentials.api_key,
        apiSecret: data.credentials.identifier,
        demo: data.is_demo,
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
    mutationFn: (broker: string) => api.connectBroker(broker, { apiKey: "", apiSecret: "" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broker-connections"] });
      toast.success("Broker connection deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete broker connection");
      console.error("Delete broker error:", error);
    },
  });

  return {
    profile: profile?.data,
    brokerConnections: brokerConnections?.data?.connections,
    isLoadingProfile,
    isLoadingBrokers,
    updateBrokerConnection: updateBrokerConnection.mutate,
    deleteBrokerConnection: deleteBrokerConnection.mutate,
  };
}
