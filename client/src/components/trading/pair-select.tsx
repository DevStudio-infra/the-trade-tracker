"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brokers } from "@/lib/constants/trading";

interface TradingPairSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  brokerId?: string;
}

export function TradingPairSelect({
  value,
  onValueChange,
  brokerId = "binance", // Default to Binance
}: TradingPairSelectProps) {
  const [open, setOpen] = React.useState(false);

  const broker = brokers.find((b) => b.id === brokerId) || brokers[0];
  const pairs = broker.pairs;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
          {value ? pairs.find((pair) => pair.symbol === value)?.displayName : "Select pair..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-slate-200 dark:border-slate-800">
        <Command>
          <CommandInput
            placeholder="Search trading pair..."
            className="border-none bg-transparent text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
          />
          <CommandEmpty className="py-2 text-center text-sm text-slate-500 dark:text-slate-400">No trading pair found.</CommandEmpty>
          <CommandGroup>
            {pairs.map((pair) => (
              <CommandItem
                key={pair.symbol}
                value={pair.symbol}
                onSelect={(currentValue) => {
                  onValueChange(currentValue);
                  setOpen(false);
                }}
                className="cursor-pointer">
                <Check className={cn("mr-2 h-4 w-4", value === pair.symbol ? "opacity-100" : "opacity-0")} />
                <div className="flex justify-between w-full">
                  <span className="font-medium text-slate-900 dark:text-white">{pair.displayName}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{pair.base}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
