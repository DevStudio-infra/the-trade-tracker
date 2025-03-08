"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockUserProfile } from "@/lib/mock-data";
import { Copy, Key, Bell, Palette, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-2xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="account">
          <TabsList className="mb-4 border-b bg-transparent p-0 h-auto">
            <TabsTrigger
              value="account"
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2">
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2">
              <Palette className="h-4 w-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none border-b-2 border-transparent px-4 pb-2">
              <Key className="h-4 w-4 mr-2" />
              API
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-0">
            <div className="space-y-6">
              <Card className="border border-border/50 bg-card/50">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">Account Information</h3>
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                      <Label className="text-sm">Email</Label>
                      <Input value={mockUserProfile.email} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Username</Label>
                      <Input value={mockUserProfile.username} />
                    </div>
                    <Button>Update Profile</Button>
                  </div>
                </div>
              </Card>

              <Card className="border border-border/50 bg-card/50">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-4">Broker Connection</h3>
                  <div className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                      <Label className="text-sm">API Key</Label>
                      <div className="flex gap-2">
                        <Input type="password" value="••••••••••••••••" readOnly className="font-mono" />
                        <Button variant="outline" size="icon" className="shrink-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Secret Key</Label>
                      <div className="flex gap-2">
                        <Input type="password" value="••••••••••••••••" readOnly className="font-mono" />
                        <Button variant="outline" size="icon" className="shrink-0">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Update API Keys
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-0">
            <Card className="border border-border/50 bg-card/50">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Trading Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Enable dark mode for the application</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium">Trade Confirmations</Label>
                      <p className="text-sm text-muted-foreground">Show confirmation dialog before placing trades</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium">Auto-close Trades</Label>
                      <p className="text-sm text-muted-foreground">Automatically close trades when take profit or stop loss is hit</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <Card className="border border-border/50 bg-card/50">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Notification Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium">Trade Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications for trade executions</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium">Signal Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get notified when new trading signals are generated</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label className="text-base font-medium">Price Alerts</Label>
                      <p className="text-sm text-muted-foreground">Receive alerts for significant price movements</p>
                    </div>
                    <Switch className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-muted-foreground/30" />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-0">
            <Card className="border border-border/50 bg-card/50">
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">API Access</h3>
                <div className="space-y-4 max-w-lg">
                  <div className="space-y-2">
                    <Label className="text-sm">API Key</Label>
                    <div className="flex gap-2">
                      <Input value="sk_live_••••••••••••••••" readOnly className="font-mono" />
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">API Secret</Label>
                    <div className="flex gap-2">
                      <Input type="password" value="••••••••••••••••" readOnly className="font-mono" />
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button size="lg">Generate New API Keys</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
