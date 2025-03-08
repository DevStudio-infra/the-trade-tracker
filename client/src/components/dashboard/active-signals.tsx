"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { mockSignals } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

export function ActiveSignals() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Signals</CardTitle>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockSignals.length === 0 ? (
            <p className="text-center text-muted-foreground">No active signals</p>
          ) : (
            mockSignals.map((signal) => (
              <div key={signal.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{signal.pair}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(signal.created_at), "MMM d, HH:mm")}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${signal.signal_type === "BUY" ? "text-green-500" : "text-red-500"}`}>{signal.signal_type}</p>
                    <p className="text-sm text-muted-foreground">{signal.confidence}% Confidence</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Stop Loss</p>
                    <p className="font-medium">${formatNumber(signal.stop_loss)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Take Profit</p>
                    <p className="font-medium">${formatNumber(signal.take_profit)}</p>
                  </div>
                </div>

                <Button className="w-full" size="sm">
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
