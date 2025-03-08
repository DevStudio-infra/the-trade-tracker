"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tradingPairs = [
  { value: "EURUSD", label: "EUR/USD", price: "1.0842" },
  { value: "GBPUSD", label: "GBP/USD", price: "1.2634" },
  { value: "USDJPY", label: "USD/JPY", price: "151.42" },
  { value: "AUDUSD", label: "AUD/USD", price: "0.6524" },
  { value: "USDCAD", label: "USD/CAD", price: "1.3564" },
  { value: "NZDUSD", label: "NZD/USD", price: "0.6098" },
];

interface TradingPairSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function TradingPairSelect({ value, onValueChange }: TradingPairSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
          {value ? tradingPairs.find((pair) => pair.value === value)?.label : "Select pair..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search pair..." />
          <CommandEmpty>No trading pair found.</CommandEmpty>
          <CommandGroup>
            {tradingPairs.map((pair) => (
              <CommandItem
                key={pair.value}
                value={pair.value}
                onSelect={(currentValue) => {
                  onValueChange(currentValue);
                  setOpen(false);
                }}>
                <Check className={cn("mr-2 h-4 w-4", value === pair.value ? "opacity-100" : "opacity-0")} />
                <div className="flex justify-between w-full">
                  <span>{pair.label}</span>
                  <span className="text-muted-foreground">{pair.price}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
