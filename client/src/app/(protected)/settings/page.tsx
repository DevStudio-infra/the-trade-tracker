"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Palette, User } from "lucide-react";
import { useApi } from "@/lib/api";
import { UserSettings } from "@/lib/api/settings";
import { toast } from "sonner";
import { AccountSettings } from "@/components/settings/account-settings";
import { PreferencesSettings } from "@/components/settings/preferences-settings";
import { BrokerSettings } from "@/components/settings/broker-settings/broker-settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  useEffect(() => {
    console.log("Settings page mounted, loading settings...");
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log("Fetching user settings...");
      const data = await api.getUserSettings();
      console.log("Settings loaded successfully:", data);
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: { subscription_plan?: string; is_active?: boolean; name?: string }) => {
    try {
      console.log("Updating settings with:", updates);
      const updatedSettings = await api.updateUserSettings(updates);
      console.log("Settings updated successfully:", updatedSettings);
      setSettings(updatedSettings);
      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    }
  };

  const handleAddBroker = async (data: {
    broker_name: string;
    credentials: {
      apiKey: string;
      identifier: string;
      password: string;
      is_demo: boolean;
    };
  }) => {
    try {
      await api.connectBroker(data.broker_name, {
        broker_name: data.broker_name,
        is_demo: data.credentials.is_demo,
        credentials: {
          apiKey: data.credentials.apiKey,
          identifier: data.credentials.identifier,
          password: data.credentials.password,
        },
      });
      await loadSettings();
      toast.success("Broker connection added successfully");
    } catch (error) {
      console.error("Error adding broker:", error);
      toast.error("Failed to add broker connection");
    }
  };

  const handleEditBroker = async (broker: UserSettings["broker_credentials"][0]) => {
    try {
      await api.updateBrokerConnection(broker.id, {
        is_demo: broker.is_demo,
        is_active: true,
      });
      await loadSettings();
      toast.success("Broker connection updated successfully");
    } catch (error) {
      console.error("Error updating broker:", error);
      toast.error("Failed to update broker connection");
    }
  };

  const handleDeleteBroker = async (brokerId: string) => {
    if (!confirm("Are you sure you want to remove this broker connection?")) {
      return;
    }

    try {
      await api.deleteBrokerConnection(brokerId);
      await loadSettings();
      toast.success("Broker connection removed successfully");
    } catch (error) {
      console.error("Error deleting broker:", error);
      toast.error("Failed to remove broker connection");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />
        <div className="relative mx-auto max-w-2xl p-6">
          {/* Header skeleton */}
          <div className="mb-6">
            <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
            <div className="h-4 w-64 mt-2 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>

          {/* Tabs skeleton */}
          <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 backdrop-blur-sm bg-white/40 dark:bg-slate-900/40">
              <div className="p-6">
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse mb-4" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    <div className="h-3 w-64 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    <div className="h-3 w-56 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                  </div>
                </div>
              </div>
            </div>

            {/* Broker connection skeleton */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 backdrop-blur-sm bg-white/40 dark:bg-slate-900/40">
              <div className="p-6">
                <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse mb-4" />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                      <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return <div className="min-h-screen flex items-center justify-center">Error loading settings</div>;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative mx-auto max-w-2xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="account">
          <TabsList className="mb-4 border-b border-slate-200 dark:border-slate-800 bg-transparent p-0 h-auto">
            <TabsTrigger
              value="account"
              className="data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2 text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2 text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
              <Palette className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="brokers"
              className="data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2 text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
              <Key className="h-4 w-4 mr-2" />
              Broker Connections
            </TabsTrigger>
          </TabsList>

          {/* Account Tab Content */}
          <TabsContent value="account" className="mt-0 space-y-6">
            <AccountSettings settings={settings} onUpdateSettings={handleUpdateSettings} />
          </TabsContent>

          {/* Preferences Tab Content */}
          <TabsContent value="preferences" className="mt-0">
            <PreferencesSettings settings={settings} onUpdateSettings={handleUpdateSettings} />
          </TabsContent>

          {/* Broker Connections Tab Content */}
          <TabsContent value="brokers" className="mt-0 space-y-6">
            <BrokerSettings settings={settings} onAddBroker={handleAddBroker} onEditBroker={handleEditBroker} onDeleteBroker={handleDeleteBroker} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
