"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TradingChart } from "@/components/trading/chart";
import { OrderForm } from "@/components/trading/order-form";
import { PositionsList } from "@/components/trading/positions-list";
import { TradingPairSelect } from "@/components/trading/pair-select";
import { brokers } from "@/lib/constants/trading";

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState(brokers[0].pairs[0].symbol);
  const [selectedBroker] = useState(brokers[0].id);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Trading</h1>
          <div className="w-[240px]">
            <TradingPairSelect value={selectedPair} onValueChange={setSelectedPair} brokerId={selectedBroker} />
          </div>
        </div>

        <div className="grid gap-6">
          {/* Main trading area */}
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Chart */}
            <Card className="lg:col-span-3 backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <TradingChart pair={selectedPair} />
            </Card>

            {/* Order form */}
            <Card className="lg:col-span-1 backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="p-6">
                <OrderForm pair={selectedPair} />
              </div>
            </Card>
          </div>

          {/* Positions list */}
          <Card className="backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <PositionsList />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
