import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { BrokerConnection } from "@/lib/api";

interface BrokerSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function BrokerSelect({ value, onValueChange }: BrokerSelectProps) {
  const { brokerConnections, isLoadingBrokers } = useSettings();

  const handleChange = (selectedId: string) => {
    const selectedBroker = brokerConnections?.find((conn) => conn.id === selectedId);
    console.log("Selected Broker Details:", {
      id: selectedBroker?.id,
      broker_name: selectedBroker?.broker_name,
      description: selectedBroker?.description,
      is_active: selectedBroker?.is_active,
      last_used: selectedBroker?.last_used,
    });
    onValueChange(selectedId);
  };

  return (
    <Select value={value || ""} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select broker credentials" />
      </SelectTrigger>
      <SelectContent>
        {isLoadingBrokers ? (
          <SelectItem value="loading" disabled>
            Loading...
          </SelectItem>
        ) : !brokerConnections || brokerConnections.length === 0 ? (
          <SelectItem value="none" disabled>
            No broker credentials
          </SelectItem>
        ) : (
          brokerConnections.map((connection: BrokerConnection) => (
            <SelectItem key={connection.id} value={connection.id}>
              {connection.description || `${connection.broker_name} Connection`}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
