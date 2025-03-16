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
import { BrokerConnection, TradingPair, WatchlistItem } from "@/lib/api";
import { toast } from "sonner";
import { usePairsApi } from "@/lib/pairs-api";
import { useQuery } from "@tanstack/react-query";

export default function TradingPage() {
  const { brokerConnections, isLoadingBrokers } = useSettings();
  const { selectedPair, setSelectedPair, selectedBroker, setSelectedBroker } = useTradingStore();
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Define as a string with a union type to allow for comparison with "WATCHLIST"
  const selectedCategory: "FOREX" | "WATCHLIST" | "CRYPTOCURRENCIES" | "SHARES" | "INDICES" | "COMMODITIES" = "FOREX";
  const api = useApi();
  const pairsApi = usePairsApi();

  // Use refs to track state without triggering re-renders
  const fetchingRef = useRef(false);
  const previousBrokerIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Fetch watchlist with React Query for better caching
  const { data: watchlist = [], isLoading: watchlistLoading } = useQuery({
    queryKey: ["watchlist"],
    queryFn: api.getWatchlist,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
      selectedCategory,
      watchlistLength: watchlist.length,
      watchlistLoading,
    });
  }, [isLoadingBrokers, brokerConnections, selectedBroker, selectedCategory, watchlist, watchlistLoading]);

  // Prefetch popular categories when component mounts
  useEffect(() => {
    pairsApi.prefetchPopularCategories();
  }, [pairsApi]);

  // Helper function to fetch trading pair details for watchlist items
  const fetchWatchlistPairs = async (watchlistItems: WatchlistItem[], isCapitalCom: boolean): Promise<TradingPair[]> => {
    const pairs: TradingPair[] = [];

    // For each watchlist item, fetch its details
    for (const item of watchlistItems) {
      try {
        let pairData: TradingPair | null = null;

        if (isCapitalCom) {
          // Direct API call instead of using hook's refetch
          const searchResults = await api.searchPairsDirect(item.symbol);
          pairData = searchResults.find((p) => p.symbol === item.symbol) || null;
        } else if (selectedBroker) {
          // For other brokers, search in broker-specific API
          const searchResults = await api.getTradingPairs(selectedBroker.id, item.symbol, 1, "", 0);
          pairData = searchResults.length > 0 ? searchResults[0] : null;
        }

        if (pairData) {
          pairs.push(pairData);
        } else {
          console.warn(`Could not find details for watchlist symbol: ${item.symbol}`);
        }
      } catch (error) {
        console.error(`Error fetching details for ${item.symbol}:`, error);
      }
    }

    return pairs;
  };

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

        // Check if this is a Capital.com broker
        const isCapitalCom = selectedBroker.broker_name.toLowerCase() === "capital.com" || selectedBroker.broker_name.toLowerCase() === "capital_com";

        // Load based on the selected category
        if (selectedCategory === "WATCHLIST") {
          // Fetch the watchlist if needed (should be cached by React Query)
          const watchlistItems = watchlist.length > 0 ? watchlist : await api.getWatchlist();

          if (watchlistItems.length > 0) {
            console.log(`Found ${watchlistItems.length} watchlist items, fetching details...`);

            // Get full trading pair details for watchlist items
            const pairs = await fetchWatchlistPairs(watchlistItems, isCapitalCom);

            if (mountedRef.current) {
              console.log(`Received ${pairs.length} watchlist trading pairs`);
              setTradingPairs(pairs);
              setSelectedPair(null);
              previousBrokerIdRef.current = brokerId;
            }
          } else {
            console.log("Watchlist is empty");
            setTradingPairs([]);
          }
        } else {
          // Load pairs for the selected category
          if (isCapitalCom) {
            try {
              // Direct API call instead of using hook's refetch
              const categoryPairs = await api.getPairsByCategory(selectedCategory);

              if (mountedRef.current && categoryPairs && categoryPairs.length > 0) {
                console.log(`Received ${categoryPairs.length} ${selectedCategory} trading pairs`);
                setTradingPairs(categoryPairs);
                setSelectedPair(null);
                previousBrokerIdRef.current = brokerId;
              } else {
                console.warn(`No pairs found for category ${selectedCategory}`);
                setTradingPairs([]);
              }
            } catch (error) {
              console.error(`Error fetching ${selectedCategory} pairs:`, error);
              toast.error(`Failed to fetch ${selectedCategory} pairs`);
              setTradingPairs([]);
            }
          } else {
            // For other brokers, use the standard approach
            try {
              const pairs = await api.getTradingPairs(brokerId, "", 25, selectedCategory, 0);

              if (mountedRef.current) {
                console.log(`Received ${pairs.length} ${selectedCategory} trading pairs`);
                setTradingPairs(pairs);
                setSelectedPair(null);
                previousBrokerIdRef.current = brokerId;
              }
            } catch (error) {
              console.error(`Error fetching ${selectedCategory} pairs:`, error);
              toast.error(`Failed to fetch ${selectedCategory} pairs`);
              setTradingPairs([]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching trading pairs:", error);

        if (mountedRef.current) {
          toast.error("Failed to fetch trading pairs");
          setTradingPairs([]);
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
  }, [selectedBroker?.id, api, pairsApi, selectedCategory, watchlist]);

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
