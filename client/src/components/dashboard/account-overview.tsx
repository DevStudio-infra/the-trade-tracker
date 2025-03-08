"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockUserProfile } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function AccountOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Plan</span>
            <span className="font-medium dark:text-white text-slate-900 capitalize">{mockUserProfile.subscription_plan}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Broker Status</span>
            <span className={cn("font-medium", mockUserProfile.broker_connected ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {mockUserProfile.broker_connected ? "Connected" : "Not Connected"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Member Since</span>
            <span className="font-medium dark:text-white text-slate-900">{new Date(mockUserProfile.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">AI Credits</span>
            <span className="font-medium dark:text-white text-slate-900">{mockUserProfile.credits}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
