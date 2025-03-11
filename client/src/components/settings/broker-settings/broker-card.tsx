import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserSettings } from "@/lib/api/settings";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface BrokerCardProps {
  broker: UserSettings["broker_credentials"][0];
  onEdit: (broker: UserSettings["broker_credentials"][0]) => void;
  onDelete: (brokerId: string) => void;
}

export function BrokerCard({ broker, onEdit, onDelete }: BrokerCardProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-slate-900 dark:text-white">{broker.broker_name}</h4>
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm text-slate-600 dark:text-slate-400">API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                value={broker.credentials.apiKey || "••••••••••••••••"}
                readOnly
                className="font-mono bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowApiKey(!showApiKey)}>
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        {broker.metadata?.settings && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-600 dark:text-slate-400">Leverage</Label>
              <p className="text-sm font-mono text-slate-900 dark:text-white">{broker.metadata.settings.leverage}</p>
            </div>
            <div>
              <Label className="text-sm text-slate-600 dark:text-slate-400">Default Lot Size</Label>
              <p className="text-sm font-mono text-slate-900 dark:text-white">{broker.metadata.settings.default_lot_size}</p>
            </div>
          </div>
        )}
        <div className="text-xs text-slate-500 dark:text-slate-400">Last used: {broker.last_used ? new Date(broker.last_used).toLocaleString() : "Never"}</div>
      </div>
    </div>
  );
}
