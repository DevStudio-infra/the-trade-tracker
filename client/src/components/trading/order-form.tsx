"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface OrderFormProps {
  pair: string | null;
}

export function OrderForm({ pair }: OrderFormProps) {
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  if (!pair) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-slate-500 dark:text-slate-400">Select a trading pair to place orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Place Order</h2>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <span>Current Price: </span>
          <span className="font-medium text-slate-900 dark:text-white">1.0842</span>
        </div>
      </div>

      <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="limit">Limit</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={side === "buy" ? "default" : "outline"}
          onClick={() => setSide("buy")}
          className={`w-full font-semibold ${side === "buy" ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-slate-200 dark:border-slate-800"}`}>
          Buy
        </Button>
        <Button
          variant={side === "sell" ? "destructive" : "outline"}
          onClick={() => setSide("sell")}
          className={`w-full font-semibold ${side === "sell" ? "bg-red-500 hover:bg-red-600 text-white" : "border-slate-200 dark:border-slate-800"}`}>
          Sell
        </Button>
      </div>

      <div className="space-y-4">
        {orderType === "limit" && (
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white">Limit Price</Label>
            <Input
              type="number"
              placeholder="Enter limit price"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="font-mono border-slate-200 dark:border-slate-800"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-slate-900 dark:text-white">Amount</Label>
          <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono border-slate-200 dark:border-slate-800" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white">Stop Loss</Label>
            <Input
              type="number"
              placeholder="Optional"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="font-mono border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white">Take Profit</Label>
            <Input
              type="number"
              placeholder="Optional"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="font-mono border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button className={`w-full font-semibold ${side === "buy" ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"} text-white`} size="lg">
            {side === "buy" ? "Buy" : "Sell"} {pair}
          </Button>
          <div className="text-sm text-center text-slate-500 dark:text-slate-400">
            Available Balance: <span className="font-mono text-slate-900 dark:text-white">$25,000.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
