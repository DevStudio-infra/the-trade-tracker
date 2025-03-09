"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockUserProfile } from "@/lib/mock-data";
import { Copy, Key, Bell, Palette, User } from "lucide-react";

export default function SettingsPage() {
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
                    <Input value={mockUserProfile.email} readOnly className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Username</Label>
                    <Input value={mockUserProfile.username} className="bg-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white" />
                  </div>
                  <Button className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700">Update Profile</Button>
                </div>
              </div>
            </Card>

            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Broker Connection</h3>
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">API Key</Label>
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
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 dark:text-slate-400">Secret Key</Label>
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
                  <Button variant="outline" className="w-full border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800">
                    Update API Keys
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="mt-0">
            <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trading Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Dark Mode</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Enable dark mode for the application</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Trade Confirmations</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Show confirmation dialog before placing trades</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium text-slate-900 dark:text-white">Auto-close Trades</Label>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Automatically close trades when take profit or stop loss is hit</p>
                    </div>
                    <Switch />
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
