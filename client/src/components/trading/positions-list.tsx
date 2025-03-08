"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockTrades } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

interface Position {
  id: string;
  pair: string;
  side: "buy" | "sell";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

export function PositionsList() {
  const positions = mockTrades
    .filter((trade) => !trade.closed)
    .map((trade) => ({
      id: trade.id,
      pair: trade.pair,
      side: trade.side,
      size: trade.size,
      entryPrice: trade.entry_price,
      currentPrice: trade.current_price,
      pnl: trade.pnl,
      pnlPercent: trade.pnl_percent,
    }));

  if (positions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">No open positions</div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Open Positions</h2>
        <div className="text-sm">
          <span className="text-muted-foreground">Total PnL: </span>
          <span className={positions.reduce((acc, pos) => acc + pos.pnl, 0) >= 0 ? "text-green-500" : "text-red-500"}>
            {formatNumber(
              positions.reduce((acc, pos) => acc + pos.pnl, 0),
              true
            )}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {positions.map((position) => (
          <Card key={position.id} className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{position.pair}</div>
                <div className="text-sm text-muted-foreground">
                  {position.side === "buy" ? "Long" : "Short"} {formatNumber(position.size)}
                </div>
              </div>
              <div className="text-right">
                <div className={position.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                  {formatNumber(position.pnl, true)} ({formatNumber(position.pnlPercent)}%)
                </div>
                <div className="text-sm text-muted-foreground">Entry: {formatNumber(position.entryPrice)}</div>
              </div>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
