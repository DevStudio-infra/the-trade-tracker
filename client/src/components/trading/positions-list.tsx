"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockTrades } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

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
    return <div className="text-center text-slate-500 dark:text-slate-400">No open positions</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Open Positions</h2>
        <div className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">Total PnL: </span>
          <span className={positions.reduce((acc, pos) => acc + pos.pnl, 0) >= 0 ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400"}>
            {formatNumber(positions.reduce((acc, pos) => acc + pos.pnl, 0))}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {positions.map((position) => (
          <Card key={position.id} className="p-4 backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{position.pair}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {position.side === "buy" ? "Long" : "Short"} {formatNumber(position.size)}
                </div>
              </div>
              <div className="text-right">
                <div className={position.pnl >= 0 ? "text-blue-500 dark:text-blue-400" : "text-red-500 dark:text-red-400"}>
                  {formatNumber(position.pnl)} ({formatNumber(position.pnlPercent)}%)
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Entry: {formatNumber(position.entryPrice)}</div>
              </div>
              <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-800">
                Close
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
