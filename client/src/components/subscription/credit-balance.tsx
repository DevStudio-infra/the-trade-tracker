"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap } from "lucide-react";

export function CreditBalance() {
  // Mock data - replace with real data from your backend
  const credits = {
    available: 42,
    total: 100,
    used: 58,
    percentUsed: 58,
  };

  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Credits Balance</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Monthly credits reset in 12 days</p>
          </div>
          <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
            <Zap className="w-6 h-6 text-blue-500 dark:text-blue-400" />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Available Credits</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{credits.available}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Used Credits</div>
              <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{credits.used}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Usage</span>
              <span>{credits.percentUsed}%</span>
            </div>
            <Progress value={credits.percentUsed} className="bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-blue-500 dark:bg-blue-400" />
          </div>
        </div>
      </div>
    </Card>
  );
}
