import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { BrokerConnection } from "@/lib/api";

interface BrokerSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function BrokerSelect({ value, onValueChange }: BrokerSelectProps) {
  const { brokerConnections, isLoadingBrokers } = useSettings();

  return (
    <Select value={value || ""} onValueChange={onValueChange}>
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
              {connection.broker_name} - {connection.credentials.identifier}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
