import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { BrokerConnection } from "@/lib/api";

interface BrokerSelectProps {
  value: BrokerConnection | null;
  onChange: (broker: BrokerConnection | null) => void;
}

export function BrokerSelect({ value, onChange }: BrokerSelectProps) {
  const { brokerConnections, isLoadingBrokers } = useSettings();

  const handleChange = (selectedId: string) => {
    const selectedBroker = brokerConnections?.find((conn) => conn.id === selectedId);
    if (selectedBroker) {
      onChange(selectedBroker);
    }
  };

  return (
    <Select value={value?.id || ""} onValueChange={handleChange}>
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
