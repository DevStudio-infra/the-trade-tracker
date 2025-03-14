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
  };
}

interface BrokerSettingsProps {
  settings: UserSettings;
  onAddBroker: (data: BrokerFormData) => Promise<void>;
  onEditBroker: (broker: UserSettings["broker_credentials"][0]) => Promise<void>;
  onDeleteBroker: (brokerId: string) => Promise<void>;
}

export function BrokerSettings({ settings, onAddBroker, onEditBroker, onDeleteBroker }: BrokerSettingsProps) {
  console.log("BrokerSettings rendered with:", {
    brokerCredentialsCount: settings.broker_credentials.length,
    brokerCredentials: settings.broker_credentials.map((cred) => ({
      id: cred.id,
      broker_name: cred.broker_name,
      hasCredentials: cred.credentials
        ? {
            hasApiKey: !!cred.credentials.apiKey,
            hasIdentifier: !!cred.credentials.identifier,
            hasPassword: !!cred.credentials.password,
          }
        : null,
    })),
  });

  const [showAddBroker, setShowAddBroker] = useState(false);
  const [editingBroker, setEditingBroker] = useState<UserSettings["broker_credentials"][0] | null>(null);

  const handleSubmit = async (data: BrokerFormData) => {
    console.log("Handling form submit:", {
      isEditing: !!editingBroker,
      formData: {
        broker_name: data.broker_name,
        hasCredentials: {
          apiKey: !!data.credentials.apiKey,
          identifier: !!data.credentials.identifier,
          password: !!data.credentials.password,
        },
      },
    });

    if (editingBroker) {
      await onEditBroker({
        ...editingBroker,
        broker_name: data.broker_name,
        credentials: {
          apiKey: data.credentials.apiKey || editingBroker.credentials.apiKey,
          identifier: data.credentials.identifier || editingBroker.credentials.identifier,
          password: data.credentials.password || editingBroker.credentials.password,
        },
      });
    } else {
      await onAddBroker(data);
    }
    setShowAddBroker(false);
    setEditingBroker(null);
  };

  const handleEdit = (broker: UserSettings["broker_credentials"][0]) => {
    console.log("Setting editing broker:", {
      id: broker.id,
      broker_name: broker.broker_name,
      credentials: {
        raw: broker.credentials,
        apiKey: broker.credentials?.apiKey,
        identifier: broker.credentials?.identifier,
        password: broker.credentials?.password,
      },
    });

    setEditingBroker(broker);
    setShowAddBroker(true);
  };

  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Broker Connections</h3>
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={() => {
              console.log("Opening add broker dialog");
              setEditingBroker(null);
              setShowAddBroker(true);
            }}>
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
            settings.broker_credentials.map((broker) => <BrokerCard key={broker.id} broker={broker} onEdit={handleEdit} onDelete={onDeleteBroker} />)
          )}
        </div>
      </div>

      <BrokerFormDialog
        open={showAddBroker}
        onOpenChange={(open) => {
          console.log("Dialog open state changing to:", open);
          if (!open) {
            console.log("Dialog closing, resetting editingBroker");
            setEditingBroker(null);
          }
          setShowAddBroker(open);
        }}
        editingBroker={editingBroker}
        onSubmit={handleSubmit}
      />
    </Card>
  );
}
