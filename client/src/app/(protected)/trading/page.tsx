"use client";

import { TradingChart } from "@/components/trading/chart";
import { OrderForm } from "@/components/trading/order-form";
import { PositionsList } from "@/components/trading/positions-list";
import { TradingPairSelect } from "@/components/trading/pair-select";
import { BrokerSelect } from "@/components/trading/broker-select";
import { AITradingConfig } from "@/components/trading/ai-trading-config";
import { CreateTradingBot } from "@/components/trading/create-trading-bot";
import { useSettings } from "@/hooks/useSettings";
import { useTradingStore } from "@/stores/trading-store";
import { useEffect, useState, useRef, useCallback } from "react";
import { useApi } from "@/lib/api";
import { BrokerConnection, TradingPair, WatchlistItem } from "@/lib/api";
import { toast } from "sonner";
import { usePairsApi } from "@/lib/pairs-api";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, BarChart2 } from "lucide-react";

interface TradingPageState {
  isLoadingBrokers: boolean;
  brokerConnections: number | undefined;
  selectedBrokerId: string | null | undefined;
  isFetching: boolean;
  previousBrokerId: string | null;
  selectedCategory: string;
  watchlistLength: number;
  watchlistLoading: boolean;
}

export default function TradingPage() {
  const { brokerConnections, isLoadingBrokers } = useSettings();
  const { selectedPair, setSelectedPair, selectedBroker, setSelectedBroker } = useTradingStore();
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const selectedCategory: "FOREX" | "WATCHLIST" | "CRYPTOCURRENCIES" | "SHARES" | "INDICES" | "COMMODITIES" = "FOREX";
  const api = useApi();
  const pairsApi = usePairsApi();

  const fetchingRef = useRef(false);
  const previousBrokerIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const lastStateRef = useRef<TradingPageState | null>(null);

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

  // Debug logs - only log when values actually change
  useEffect(() => {
    const currentState: TradingPageState = {
      isLoadingBrokers,
      brokerConnections: brokerConnections?.length,
      selectedBrokerId: selectedBroker?.id,
      isFetching: fetchingRef.current,
      previousBrokerId: previousBrokerIdRef.current,
      selectedCategory,
      watchlistLength: watchlist.length,
      watchlistLoading,
    };

    // Only log if state has actually changed
    const lastStateStr = JSON.stringify(lastStateRef.current);
    const currentStateStr = JSON.stringify(currentState);

    if (lastStateStr !== currentStateStr) {
      console.log("Trading Page State:", currentState);
      lastStateRef.current = currentState;
    }
  }, [isLoadingBrokers, brokerConnections, selectedBroker, selectedCategory, watchlist, watchlistLoading]);

  // Prefetch popular categories when component mounts
  useEffect(() => {
    pairsApi.prefetchPopularCategories();
  }, [pairsApi]);

  // Clear state when selectedBroker becomes falsy
  useEffect(() => {
    if (!selectedBroker) {
      setTradingPairs([]);
      setSelectedPair(null);
    }
  }, [selectedBroker]);

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

  // Fetch trading pairs when selected broker changes and is truthy
  useEffect(() => {
    if (!selectedBroker) return;

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
        setSelectedPair(null);

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
            setSelectedPair(null);
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
          setSelectedPair(null);
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
  }, [selectedBroker, api, pairsApi, selectedCategory, watchlist]);

  const handleBrokerChange = useCallback(
    (broker: BrokerConnection | null) => {
      if (broker?.id !== selectedBroker?.id) {
        setSelectedBroker(broker);
      }
    },
    [selectedBroker, setSelectedBroker]
  );

  // Handler for TradingPairSelect: expects TradingPair | null
  const handlePairChange = useCallback(
    (pair: TradingPair | null) => {
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

        {/* Trading tabs - Manual vs AI-powered */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full ">
          <TabsList className="w-full grid grid-cols-2 mb-8  h-fit">
            <TabsTrigger value="manual" className="flex items-center gap-2 py-3">
              <BarChart2 className="w-5 h-5" />
              <span className="font-medium">Manual Trading</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2 py-3">
              <Bot className="w-5 h-5" />
              <span className="font-medium">AI-Powered Trading</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <TradingChart pair={selectedPair} />
              </div>
              <div className="space-y-6">
                <OrderForm pair={selectedPair} />
                <PositionsList />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2">
                <TradingChart pair={selectedPair} />
              </div>
              <div className="space-y-6">
                <CreateTradingBot />
                <PositionsList />
              </div>
            </div>
            <div className="mt-6">
              <AITradingConfig showOnlyActiveBots={true} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
