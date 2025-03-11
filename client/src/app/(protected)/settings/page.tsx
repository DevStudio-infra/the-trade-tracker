"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Palette, User, Eye, EyeOff } from "lucide-react";
import { useApi } from "@/lib/api";
import { UserSettings } from "@/lib/api/settings";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BrokerForm {
  broker_name: string;
  credentials: {
    apiKey: string;
    identifier: string;
    password: string;
    is_demo: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingBroker, setEditingBroker] = useState<UserSettings["broker_credentials"][0] | null>(null);
  const [newBroker, setNewBroker] = useState<BrokerForm>({
    broker_name: "",
    credentials: {
      apiKey: "",
      identifier: "",
      password: "",
      is_demo: false,
    },
  });
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

  const handleAddBroker = async () => {
    try {
      if (!newBroker.broker_name) {
        toast.error("Please select a broker");
        return;
      }

      // Validate required fields based on broker type
      if (!newBroker.credentials.apiKey || !newBroker.credentials.identifier || !newBroker.credentials.password) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Call your API to add the broker
      await api.connectBroker(newBroker.broker_name, {
        broker_name: newBroker.broker_name,
        is_demo: newBroker.credentials.is_demo || false,
        credentials: {
          apiKey: newBroker.credentials.apiKey,
          identifier: newBroker.credentials.identifier,
          password: newBroker.credentials.password,
        },
      });

      // Refresh settings to get updated broker list
      await loadSettings();

      // Reset form and close modal
      setNewBroker({
        broker_name: "",
        credentials: {
          apiKey: "",
          identifier: "",
          password: "",
          is_demo: false,
        },
      });
      setShowAddBroker(false);
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
            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Account Information</h3>
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Email</Label>
                    <Input value={settings.email} disabled className="bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-slate-900 dark:text-slate-300" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Your email address is managed through your authentication provider.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Full Name</Label>
                    <Input
                      value={settings.name || ""}
                      onChange={(e) => handleUpdateSettings({ name: e.target.value })}
                      placeholder="Enter your full name"
                      className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Your name will be used for communications and trading reports.</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Preferences Tab Content */}
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

            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 mt-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notifications</h3>
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

          {/* Broker Connections Tab Content */}
          <TabsContent value="brokers" className="mt-0 space-y-6">
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
                    settings.broker_credentials.map((cred) => (
                      <div key={cred.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-base font-semibold text-slate-900 dark:text-white">{cred.broker_name}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{cred.is_demo ? "Demo Account" : "Live Account"}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingBroker(cred as UserSettings["broker_credentials"][0]);
                                setShowAddBroker(true);
                              }}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteBroker(cred.id)}>
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
                                  value={cred.credentials.apiKey || "••••••••••••••••"}
                                  readOnly
                                  className="font-mono bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowApiKey(!showApiKey)}>
                                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </div>
                          {cred.metadata?.settings && (
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm text-slate-600 dark:text-slate-400">Leverage</Label>
                                <p className="text-sm font-mono text-slate-900 dark:text-white">{cred.metadata.settings.leverage}</p>
                              </div>
                              <div>
                                <Label className="text-sm text-slate-600 dark:text-slate-400">Default Lot Size</Label>
                                <p className="text-sm font-mono text-slate-900 dark:text-white">{cred.metadata.settings.default_lot_size}</p>
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-slate-500 dark:text-slate-400">Last used: {cred.last_used ? new Date(cred.last_used).toLocaleString() : "Never"}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>

            {/* Add Broker Modal */}
            <Dialog open={showAddBroker} onOpenChange={setShowAddBroker}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingBroker ? "Edit Broker Connection" : "Add New Broker"}</DialogTitle>
                  <DialogDescription>{editingBroker ? "Update your broker connection settings." : "Connect a new broker to start trading."}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="broker">Broker</Label>
                    <Select
                      disabled={!!editingBroker}
                      value={editingBroker ? editingBroker.broker_name : newBroker.broker_name}
                      onValueChange={(value) =>
                        setNewBroker({ ...newBroker, broker_name: value, credentials: { ...newBroker.credentials, apiKey: "", identifier: "", password: "", is_demo: false } })
                      }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a broker" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="capital_com">Capital.com</SelectItem>
                        <SelectItem value="other" disabled>
                          More brokers coming soon
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(editingBroker?.broker_name === "capital_com" || newBroker.broker_name === "capital_com") && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="apiKey">API Key</Label>
                        <div className="relative">
                          <Input
                            id="apiKey"
                            type={showApiKey ? "text" : "password"}
                            value={editingBroker ? editingBroker.credentials.apiKey : newBroker.credentials.apiKey || ""}
                            onChange={(e) => {
                              if (editingBroker) {
                                setEditingBroker({
                                  ...editingBroker,
                                  credentials: { ...editingBroker.credentials, apiKey: e.target.value },
                                });
                              } else {
                                setNewBroker({
                                  ...newBroker,
                                  credentials: { ...newBroker.credentials, apiKey: e.target.value },
                                });
                              }
                            }}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowApiKey(!showApiKey)}>
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="identifier">Identifier</Label>
                        <Input
                          id="identifier"
                          value={editingBroker ? editingBroker.credentials.identifier : newBroker.credentials.identifier || ""}
                          onChange={(e) => {
                            if (editingBroker) {
                              setEditingBroker({
                                ...editingBroker,
                                credentials: { ...editingBroker.credentials, identifier: e.target.value },
                              });
                            } else {
                              setNewBroker({
                                ...newBroker,
                                credentials: { ...newBroker.credentials, identifier: e.target.value },
                              });
                            }
                          }}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={editingBroker ? editingBroker.credentials.password : newBroker.credentials.password || ""}
                            onChange={(e) => {
                              if (editingBroker) {
                                setEditingBroker({
                                  ...editingBroker,
                                  credentials: { ...editingBroker.credentials, password: e.target.value },
                                });
                              } else {
                                setNewBroker({
                                  ...newBroker,
                                  credentials: { ...newBroker.credentials, password: e.target.value },
                                });
                              }
                            }}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="demo"
                          checked={editingBroker ? editingBroker.is_demo : newBroker.credentials.is_demo || false}
                          onCheckedChange={(checked) => {
                            if (editingBroker) {
                              setEditingBroker({
                                ...editingBroker,
                                is_demo: checked,
                              });
                            } else {
                              setNewBroker({
                                ...newBroker,
                                credentials: { ...newBroker.credentials, is_demo: checked },
                              });
                            }
                          }}
                        />
                        <Label htmlFor="demo">Demo Account</Label>
                      </div>
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddBroker(false);
                      setEditingBroker(null);
                      setNewBroker({ broker_name: "", credentials: { apiKey: "", identifier: "", password: "", is_demo: false } });
                    }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (editingBroker) {
                        await handleEditBroker(editingBroker);
                      } else {
                        await handleAddBroker();
                      }
                      setShowAddBroker(false);
                      setEditingBroker(null);
                      setNewBroker({ broker_name: "", credentials: { apiKey: "", identifier: "", password: "", is_demo: false } });
                    }}>
                    {editingBroker ? "Save Changes" : "Add Broker"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
