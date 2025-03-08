"use client";

import { Card } from "@/components/ui/card";
import { TradingChart } from "@/components/trading/chart";
import { OrderForm } from "@/components/trading/order-form";
import { PositionsList } from "@/components/trading/positions-list";
import { TradingPairSelect } from "@/components/trading/pair-select";
import { useState } from "react";

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState("EURUSD");

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle blue gradient background */}
      <div className="fixed inset-0 dark:bg-gradient-to-br dark:from-[#050E1A] dark:via-black dark:to-black light:bg-gradient-to-br light:from-slate-100 light:to-white pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Trading</h1>
          <TradingPairSelect value={selectedPair} onValueChange={setSelectedPair} />
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {/* Chart and Order Form */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="p-4 h-[600px]">
              <TradingChart pair={selectedPair} />
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <OrderForm pair={selectedPair} />
              </Card>
              <Card className="p-4">
                <PositionsList pair={selectedPair} />
              </Card>
            </div>
          </div>

          {/* Trading Information */}
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Market Information</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spread</span>
                  <span className="font-medium">0.00012</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h Volume</span>
                  <span className="font-medium">1.2M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h High</span>
                  <span className="font-medium text-emerald-500 dark:text-emerald-400">1.0865</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">24h Low</span>
                  <span className="font-medium text-red-500 dark:text-red-400">1.0801</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Position Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Open Positions</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total P/L</span>
                  <span className="font-medium text-emerald-500 dark:text-emerald-400">+$1,234.56</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margin Used</span>
                  <span className="font-medium">$5,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Margin</span>
                  <span className="font-medium">$15,000</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
