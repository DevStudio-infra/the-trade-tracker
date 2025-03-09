"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { mockSignals } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

export function ActiveSignals() {
  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-slate-900 dark:text-white">Active Signals</CardTitle>
        <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-800">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockSignals.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400">No active signals</p>
          ) : (
            mockSignals.map((signal) => (
              <div key={signal.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{signal.pair}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(signal.created_at), "MMM d, HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${signal.signal_type === "BUY" ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400"}`}>{signal.signal_type}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{signal.confidence}% Confidence</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Stop Loss</p>
                    <p className="font-medium text-slate-900 dark:text-white">${formatNumber(signal.stop_loss)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 dark:text-slate-400">Take Profit</p>
                    <p className="font-medium text-slate-900 dark:text-white">${formatNumber(signal.take_profit)}</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" className="w-full border-slate-200 dark:border-slate-800">
                  View Details
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
