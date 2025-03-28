import { Button } from "@/components/ui/button";
import { UserSettings } from "@/lib/api/settings";

interface BrokerCardProps {
  broker: UserSettings["broker_credentials"][0];
  onEdit: (broker: UserSettings["broker_credentials"][0]) => void;
  onDelete: (brokerId: string) => void;
}

export function BrokerCard({ broker, onEdit, onDelete }: BrokerCardProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">{broker.broker_name} </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{broker.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(broker)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(broker.id)}>
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
