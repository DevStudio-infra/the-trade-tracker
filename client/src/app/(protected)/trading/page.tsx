"use client";

import { Card } from "@/components/ui/card";
import { TradingChart } from "@/components/trading/chart";
import { OrderForm } from "@/components/trading/order-form";
import { PositionsList } from "@/components/trading/positions-list";
import { TradingPairSelect } from "@/components/trading/pair-select";
import { BrokerSelect } from "@/components/trading/broker-select";
import { useSettings } from "@/hooks/useSettings";
import { useTradingStore } from "@/stores/trading-store";
import { useEffect, useState, useRef, useCallback } from "react";
import { useApi } from "@/lib/api";
import { BrokerConnection, TradingPair } from "@/lib/api";
import { toast } from "sonner";

export default function TradingPage() {
  const { brokerConnections, isLoadingBrokers } = useSettings();
  const { selectedPair, setSelectedPair, selectedBroker, setSelectedBroker } = useTradingStore();
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const api = useApi();

  // Use refs to track state without triggering re-renders
  const fetchingRef = useRef(false);
  const previousBrokerIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Set mounted status on component mount/unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Debug logs
  useEffect(() => {
    console.log("Trading Page State:", {
      isLoadingBrokers,
      brokerConnections,
      selectedBroker,
      isFetching: fetchingRef.current,
      previousBrokerId: previousBrokerIdRef.current,
    });
  }, [isLoadingBrokers, brokerConnections, selectedBroker]);

  // Fetch trading pairs when selected broker changes
  useEffect(() => {
    // Skip if no broker selected
    if (!selectedBroker) {
      setTradingPairs([]);
      setSelectedPair(null);
      return;
    }

    // Skip if we're already fetching or if the broker hasn't changed
    if (fetchingRef.current || previousBrokerIdRef.current === selectedBroker.id) {
      return;
    }

    // Update refs to prevent re-triggering
    fetchingRef.current = true;

    async function fetchPairs() {
      const brokerId = selectedBroker?.id;
      if (!brokerId) return;

      try {
        console.log(`Fetching initial trading pairs for broker: ${brokerId}`);
        setIsLoading(true);

        // Start with empty state to ensure a clean display
        setTradingPairs([]);

        // Fetch a larger initial set for better selection options
        const pairs = await api.getTradingPairs(brokerId, "", 100);

        // Only update state if component is still mounted
        if (mountedRef.current) {
          console.log(`Received ${pairs.length} initial trading pairs`);

          // Verify the pairs have the expected structure
          if (pairs.length > 0) {
            console.log("First pair sample:", pairs[0]);
          }

          setTradingPairs(pairs);
          setSelectedPair(null);
          previousBrokerIdRef.current = brokerId;
        }
      } catch (error) {
        console.error("Error fetching trading pairs:", error);

        if (mountedRef.current) {
          toast.error("Failed to fetch trading pairs");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        fetchingRef.current = false;
      }
    }

    fetchPairs();

    // Explicitly list dependencies to prevent unwanted re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBroker?.id]);

  const handleBrokerChange = useCallback(
    (broker: BrokerConnection | null) => {
      if (broker?.id !== selectedBroker?.id) {
        setSelectedBroker(broker);
      }
    },
    [selectedBroker, setSelectedBroker]
  );

  const handlePairChange = useCallback(
    (pair: string | null) => {
      setSelectedPair(pair);
    },
    [setSelectedPair]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Trading</h1>
          <div className="flex items-center gap-4">
            <div className="w-[240px]">
              <BrokerSelect value={selectedBroker} onChange={handleBrokerChange} />
            </div>
            <div className="w-[240px]">
              <TradingPairSelect
                pairs={tradingPairs}
                value={selectedPair}
                onChange={handlePairChange}
                isLoading={isLoading}
                disabled={!selectedBroker}
                connectionId={selectedBroker?.id || null}
              />
            </div>
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
