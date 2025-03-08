"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { mockTrades } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

export function RecentTrades() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Trades</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTrades.length === 0 ? (
            <p className="text-center text-muted-foreground">No recent trades</p>
          ) : (
            mockTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium">{trade.pair}</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(trade.created_at), "MMM d, HH:mm")}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className={`font-medium ${trade.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {trade.pnl >= 0 ? "+" : ""}${formatNumber(Math.abs(trade.pnl))}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
