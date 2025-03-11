"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Key, Bell, Palette, User } from "lucide-react";
import { useApi } from "@/lib/api";
import { UserSettings } from "@/lib/api/settings";
import { toast } from "sonner";

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

  const handleUpdateSettings = async (updates: { subscription_plan?: string; is_active?: boolean }) => {
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
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
              value="notifications"
              className="data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2 text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2 text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300">
              <Key className="h-4 w-4 mr-2" />
              API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-0 space-y-6">
            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Information</h3>
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Email</Label>
                    <Input value={settings.email} readOnly className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Subscription Plan</Label>
                    <Input value={settings.subscription_plan} readOnly className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Credits</Label>
                    <Input value={settings.credits.toString()} readOnly className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>
            </Card>

            {settings.broker_credentials.length > 0 && (
              <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Broker Connection</h3>
                  <div className="space-y-4 max-w-lg">
                    {settings.broker_credentials.map((cred) => (
                      <div key={cred.id} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-600 dark:text-slate-400">Broker Name</Label>
                          <Input value={cred.broker_name} readOnly className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-slate-600 dark:text-slate-400">API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              type="password"
                              value={cred.credentials.apiKey || "••••••••••••••••"}
                              readOnly
                              className="font-mono bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                            />
                            <Button variant="outline" size="icon" className="shrink-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="mt-0">
            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trading Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Account Active</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Enable or disable your trading account</p>
                    </div>
                    <Switch checked={settings.is_active} onCheckedChange={(checked) => handleUpdateSettings({ is_active: checked })} />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Trade Notifications</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive notifications for trade executions</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Signal Alerts</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Get notified when new trading signals are generated</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Price Alerts</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Receive alerts for significant price movements</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-0">
            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">API Access</h3>
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">API Key</Label>
                    <div className="flex gap-2">
                      <Input value="sk_live_••••••••••••••••" readOnly className="font-mono bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                      <Button variant="outline" size="icon" className="shrink-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">API Secret</Label>
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value="••••••••••••••••"
                        readOnly
                        className="font-mono bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                      />
                      <Button variant="outline" size="icon" className="shrink-0 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700">Generate New API Keys</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
