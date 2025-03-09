"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { mockTrades } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

export function RecentTrades() {
  return (
    <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTrades.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400">No recent trades</p>
          ) : (
            mockTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <div className="space-y-1">
                  <p className="font-medium text-slate-900 dark:text-white">{trade.pair}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{format(new Date(trade.created_at), "MMM d, HH:mm")}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className={`font-medium ${trade.pnl >= 0 ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${formatNumber(Math.abs(trade.pnl))}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {trade.strategy_used} ({trade.confidence_score}%)
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
