import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserSettings } from "@/lib/api/settings";
import { useState } from "react";
import { BrokerCard } from "./broker-card";
import { BrokerFormDialog } from "./broker-form-dialog";

interface BrokerFormData {
  broker_name: string;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    is_demo: boolean;
  };
}

interface BrokerSettingsProps {
  settings: UserSettings;
  onAddBroker: (data: BrokerFormData) => Promise<void>;
  onEditBroker: (broker: UserSettings["broker_credentials"][0]) => Promise<void>;
  onDeleteBroker: (brokerId: string) => Promise<void>;
}

export function BrokerSettings({ settings, onAddBroker, onEditBroker, onDeleteBroker }: BrokerSettingsProps) {
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [editingBroker, setEditingBroker] = useState<UserSettings["broker_credentials"][0] | null>(null);

  const handleSubmit = async (data: BrokerFormData) => {
    if (editingBroker) {
      await onEditBroker({
        ...editingBroker,
        broker_name: data.broker_name,
        is_demo: data.credentials.is_demo,
        credentials: {
          ...editingBroker.credentials,
          apiKey: data.credentials.apiKey,
          identifier: data.credentials.identifier,
          password: data.credentials.password,
        },
      });
    } else {
      await onAddBroker(data);
    }
    setShowAddBroker(false);
    setEditingBroker(null);
  };

  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Broker Connections</h3>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => setShowAddBroker(true)}>
            Add New Broker
          </Button>
        </div>
        <div className="space-y-6">
          {settings.broker_credentials.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">No broker connections yet.</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Add a broker to start trading.</p>
            </div>
          ) : (
            settings.broker_credentials.map((broker) => (
              <BrokerCard
                key={broker.id}
                broker={broker}
                onEdit={(broker) => {
                  setEditingBroker(broker);
                  setShowAddBroker(true);
                }}
                onDelete={onDeleteBroker}
              />
            ))
          )}
        </div>
      </div>

      <BrokerFormDialog open={showAddBroker} onOpenChange={setShowAddBroker} editingBroker={editingBroker} onSubmit={handleSubmit} />
    </Card>
  );
}
