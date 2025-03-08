"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface OrderFormProps {
  pair: string;
}

export function OrderForm({ pair }: OrderFormProps) {
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-lg font-semibold">Place Order</h2>
        <div className="text-sm text-muted-foreground">
          <span>Current Price: </span>
          <span className="font-medium">1.0842</span>
        </div>
      </div>

      <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "market" | "limit")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="limit">Limit</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-2">
        <Button variant={side === "buy" ? "default" : "outline"} onClick={() => setSide("buy")} className="w-full font-semibold">
          Buy
        </Button>
        <Button variant={side === "sell" ? "destructive" : "outline"} onClick={() => setSide("sell")} className="w-full font-semibold">
          Sell
        </Button>
      </div>

      <div className="space-y-4">
        {orderType === "limit" && (
          <div className="space-y-2">
            <Label>Limit Price</Label>
            <Input type="number" placeholder="Enter limit price" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} className="font-mono" />
          </div>
        )}

        <div className="space-y-2">
          <Label>Amount</Label>
          <Input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Stop Loss</Label>
            <Input type="number" placeholder="Optional" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Take Profit</Label>
            <Input type="number" placeholder="Optional" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className="font-mono" />
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Button className="w-full font-semibold" size="lg">
            {side === "buy" ? "Buy" : "Sell"} {pair}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            Available Balance: <span className="font-mono">$25,000.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
