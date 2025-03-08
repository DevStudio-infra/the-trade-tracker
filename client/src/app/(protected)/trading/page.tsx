"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { TradingChart } from "@/components/trading/chart";
import { OrderForm } from "@/components/trading/order-form";
import { PositionsList } from "@/components/trading/positions-list";
import { TradingPairSelect } from "@/components/trading/pair-select";

export default function TradingPage() {
  const [selectedPair, setSelectedPair] = useState("EURUSD");

  return (
    <div className="container py-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Trading</h1>
        <TradingPairSelect value={selectedPair} onValueChange={setSelectedPair} />
      </div>

      <div className="grid gap-6">
        {/* Main trading area */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Chart */}
          <Card className="lg:col-span-3 p-6">
            <TradingChart pair={selectedPair} />
          </Card>

          {/* Order form */}
          <Card className="lg:col-span-1 p-6">
            <OrderForm pair={selectedPair} />
          </Card>
        </div>

        {/* Positions list */}
        <Card className="p-6">
          <PositionsList />
        </Card>
      </div>
    </div>
  );
}
