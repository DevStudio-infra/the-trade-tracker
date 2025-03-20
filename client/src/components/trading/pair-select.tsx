"use client";

import * as React from "react";
import { Search, X, ChevronDown, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TradingPair } from "@/lib/api";
import { useApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import * as ReactDOM from "react-dom";

interface TradingPairSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  pairs: TradingPair[];
  isLoading?: boolean;
  disabled?: boolean;
  connectionId?: string | null;
}

// Define instrument categories with nice labels and icons
const ASSET_CATEGORIES: Record<string, string> = {
  WATCHLIST: "Watchlist",
  FOREX: "Forex",
  CRYPTOCURRENCIES: "Crypto",
  SHARES: "Stocks",
  INDICES: "Indices",
  COMMODITIES: "Commodities",
};

// Map Capital.com API instrument types to our categories
const INSTRUMENT_TYPE_TO_CATEGORY: Record<string, string> = {
  // Forex mappings
  CURRENCIES: "FOREX",
  FX: "FOREX",
  FOREX: "FOREX",
  CURRENCY: "FOREX",
  CURRENCY_PAIR: "FOREX",
  MAJOR: "FOREX",
  MINOR: "FOREX",
  FX_PAIR: "FOREX",
  CURRENCY_PAIRS: "FOREX",

  // Crypto mappings
  CRYPTOCURRENCIES: "CRYPTOCURRENCIES",
  CRYPTOCURRENCY: "CRYPTOCURRENCIES",
  CRYPTO: "CRYPTOCURRENCIES",
  CRYPTO_PAIR: "CRYPTOCURRENCIES",
  BITCOIN: "CRYPTOCURRENCIES",
  ALTCOIN: "CRYPTOCURRENCIES",
  CRYPTO_PAIRS: "CRYPTOCURRENCIES",

  // Stock mappings
  SHARES: "SHARES",
  STOCKS: "SHARES",
  OPT_SHARES: "SHARES",
  SHARE: "SHARES",
  STOCK: "SHARES",
  EQUITIES: "SHARES",
  EQUITY: "SHARES",

  // Indices mappings
  INDICES: "INDICES",
  INDEX: "INDICES",
  INDICE: "INDICES",

  // Commodities mappings
  COMMODITIES: "COMMODITIES",
  COMMODITY: "COMMODITIES",
  OIL: "COMMODITIES",
  OILS: "COMMODITIES",
  METALS: "COMMODITIES",
  METAL: "COMMODITIES",
  AGRICULTURAL: "COMMODITIES",
  ENERGY: "COMMODITIES",
  NATURAL_GAS: "COMMODITIES",
  PRECIOUS_METALS: "COMMODITIES",
  GOLD: "COMMODITIES",
  SILVER: "COMMODITIES",
};

// Helper function to map instrument types to categories intelligently
const getInstrumentCategory = (pair: TradingPair): string | null => {
  if (!pair.type) return null;

  // First try exact match in uppercase
  const upperType = pair.type.toUpperCase();
  if (INSTRUMENT_TYPE_TO_CATEGORY[upperType]) {
    return INSTRUMENT_TYPE_TO_CATEGORY[upperType];
  }

  // Common currency codes for major and minor forex pairs
  const commonCurrencies = ["EUR", "USD", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "SEK", "NOK", "DKK", "HKD", "SGD"];

  // Check for standard forex pair patterns
  const symbol = pair.symbol.toUpperCase();

  // Check if it's a forex pair by looking at common patterns
  const isForexPair =
    // Standard 6-char forex pair (e.g., EURUSD)
    (symbol.length === 6 && commonCurrencies.some((curr) => symbol.startsWith(curr)) && commonCurrencies.some((curr) => symbol.endsWith(curr))) ||
    // Forex pair with optional suffix (e.g., EURUSD_W)
    (symbol.length === 8 && symbol.endsWith("_W") && commonCurrencies.some((curr) => symbol.startsWith(curr)) && commonCurrencies.some((curr) => symbol.slice(3, 6) === curr)) ||
    // Slash format (e.g., EUR/USD)
    (symbol.includes("/") && commonCurrencies.some((curr) => symbol.startsWith(curr)) && commonCurrencies.some((curr) => symbol.endsWith(curr)));

  if (isForexPair) {
    console.log(`Detected FOREX pair by symbol pattern: ${symbol}`);
    return "FOREX";
  }

  // Common cryptocurrency tokens
  const cryptoTokens = ["BTC", "ETH", "USDT", "BNB", "XRP", "ADA", "DOT", "DOGE", "SHIB", "MATIC", "SOL", "AVAX", "LINK", "UNI", "LTC"];

  // Check for crypto patterns
  const isCryptoPair = cryptoTokens.some((token) => symbol.includes(token)) || symbol.endsWith("USDT") || symbol.includes("PERP") || /[A-Z0-9]{4,}/.test(symbol); // Most crypto symbols are 4+ characters

  if (isCryptoPair) {
    return "CRYPTOCURRENCIES";
  }

  // Try substring matches if no exact match
  // Words that strongly indicate a specific category
  const categoryKeywords: Record<string, string[]> = {
    FOREX: ["FX", "CURRENCY", "CURRENCIES", "FOREX"],
    CRYPTOCURRENCIES: ["CRYPTO", "BITCOIN", "ETH", "BTC", "COIN"],
    SHARES: ["SHARE", "STOCK", "EQUITY", ".US", ".UK", ".DE"],
    INDICES: ["INDEX", "INDICE", ".INDEX", "US30", "US500", "GER40", "UK100"],
    COMMODITIES: ["COMMODITY", "OIL", "METAL", "GOLD", "SILVER", "GAS", "ENERGY", "BRENT", "WTI", "NAT_GAS"],
  };

  // Check if the type or symbol contains any of the keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => upperType.includes(keyword) || symbol.includes(keyword) || pair.displayName.toUpperCase().includes(keyword))) {
      return category;
    }
  }

  console.log(`Unmapped instrument type: ${pair.type} for symbol: ${symbol}, display name: ${pair.displayName}`);
  return null;
};

// Limits based on subscription tier
const FAVORITE_LIMITS: Record<string, number> = {
  Free: 10,
  Pro: 50,
};

// Constants for pagination
const BATCH_SIZE = 20;

export function TradingPairSelect({ value, onChange, pairs: initialPairs, isLoading = false, disabled = false, connectionId }: TradingPairSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pairs, setPairs] = React.useState<TradingPair[]>(initialPairs);
  const [categoryLoading] = React.useState<Record<string, boolean>>({});
  const [searching, setSearching] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState("WATCHLIST");
  const [hasMore, setHasMore] = React.useState(true);
  const [categoryPage, setCategoryPage] = React.useState<Record<string, number>>({});
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const api = useApi();
  const { profile, brokerConnections } = useSettings();
  const queryClient = useQueryClient();

  const subscriptionPlan = profile?.subscriptionPlan || "Free";
  const favoriteLimit = FAVORITE_LIMITS[subscriptionPlan] || FAVORITE_LIMITS.Free;

  // Add logging to check broker connections
  React.useEffect(() => {
    console.log("TradingPairSelect - Broker connections:", {
      connections: brokerConnections,
      connectionId,
      hasConnections: Array.isArray(brokerConnections) && brokerConnections.length > 0,
    });
  }, [brokerConnections, connectionId]);

  // Load watchlist from API using React Query
  const { data: watchlist = [], isLoading: isLoadingWatchlist } = useQuery({
    queryKey: ["watchlist"],
    queryFn: api.getWatchlist,
    staleTime: 1000 * 60 * 10, // 10 minutes - increased to reduce refreshes
    // Only refetch when the component is mounted and visible
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable auto refetching when window gets focus
    retry: 2, // Retry twice on failure
    onError: (error) => {
      console.error("Error fetching watchlist:", error);
      toast.error("Failed to load watchlist");
    },
  });

  // New: Load all available categories using React Query
  const { data: availableCategories = [] } = useQuery({
    queryKey: ["pairs-categories"],
    queryFn: api.getPairsCategories,
    staleTime: 1000 * 60 * 60, // 1 hour
    // Only fetch when the dialog is open
    enabled: open,
  });

  // Extract just the symbols for easier checking
  const favorites = React.useMemo(() => watchlist.map((item) => item.symbol), [watchlist]);

  // Add a specific query for complete watchlist pair data
  const { data: watchlistPairsData = [], isLoading: isLoadingWatchlistPairs } = useQuery({
    queryKey: ["watchlist-pairs-data"],
    queryFn: async () => {
      if (!favorites.length) return [];

      try {
        // Use the direct search API with multiple symbols
        const allPairsData = await Promise.all(
          favorites.map((symbol) =>
            api
              .searchPairsDirect(symbol)
              .then((results) => results.find((p) => p.symbol === symbol) || null)
              .catch(() => null)
          )
        );

        return allPairsData.filter(Boolean) as TradingPair[];
      } catch (error) {
        console.error("Error fetching watchlist pairs data:", error);
        return [];
      }
    },
    enabled: open && selectedCategory === "WATCHLIST" && favorites.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // New: Prefetch pairs for the most popular categories
  React.useEffect(() => {
    if (open && availableCategories.length > 0) {
      // Prefetch popular categories
      ["FOREX", "CRYPTOCURRENCIES", "INDICES", "COMMODITIES"].forEach((category) => {
        if (availableCategories.includes(category)) {
          queryClient.prefetchQuery({
            queryKey: ["pairs-by-category", category],
            queryFn: () => api.getPairsByCategory(category),
            staleTime: 1000 * 60 * 15, // 15 minutes
          });
        }
      });
    }
  }, [open, availableCategories, queryClient, api]);

  // New: Use React Query for category data - with stable function
  const getPairsByCategory = React.useCallback(() => (selectedCategory === "WATCHLIST" ? Promise.resolve([]) : api.getPairsByCategory(selectedCategory)), [selectedCategory, api]);

  const {
    data: categoryPairs = [],
    isLoading: isCategoryLoading,
    isFetching: isCategoryFetching,
  } = useQuery({
    queryKey: ["pairs-by-category", selectedCategory],
    queryFn: getPairsByCategory,
    staleTime: 1000 * 60 * 15, // 15 minutes
    // Only fetch when the dialog is open and we're not looking at watchlist
    enabled: open && selectedCategory !== "WATCHLIST",
  });

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: (symbol: string) => api.addToWatchlist(symbol, connectionId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist-pairs-data"] });
      toast.success("Added to watchlist");
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 403) {
        toast.error(`You've reached your limit of ${favoriteLimit} pairs with your ${subscriptionPlan} plan`);
      } else {
        toast.error("Failed to add to watchlist");
      }
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: (symbol: string) => api.removeFromWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist-pairs-data"] });
      toast.success("Removed from watchlist");
    },
    onError: () => {
      toast.error("Failed to remove from watchlist");
    },
  });

  // Get the selected pair
  const selectedPair = React.useMemo(() => {
    return value ? pairs.find((pair) => pair.symbol === value) : null;
  }, [value, pairs]);

  // Modified loadPairs function with better error handling
  const loadPairs = React.useCallback(
    async (connection: string, offset: number = 0) => {
      if (!connection) {
        console.error("Cannot load pairs: No connection ID provided");
        return [];
      }

      try {
        setIsFetchingMore(true);
        console.log(`Loading more pairs for ${connection}, category: ${selectedCategory}, offset: ${offset}`);
        const results = await api.getTradingPairs(connection, "", BATCH_SIZE, selectedCategory, offset);
        return results;
      } catch (error) {
        console.error("Error loading pairs:", error);
        toast.error(`Failed to load trading pairs: ${error instanceof Error ? error.message : "Unknown error"}`);
        return [];
      } finally {
        setIsFetchingMore(false);
      }
    },
    [api, selectedCategory]
  );

  // Group and sort pairs by category
  const groupAndSortPairs = React.useCallback((pairs: TradingPair[]): Record<string, TradingPair[]> => {
    const grouped: Record<string, TradingPair[]> = {};

    // Initialize categories
    Object.keys(ASSET_CATEGORIES).forEach((category) => {
      grouped[category] = [];
    });

    // Group pairs by category
    pairs.forEach((pair) => {
      const category = getInstrumentCategory(pair);
      if (category && grouped[category]) {
        grouped[category].push(pair);
      }
    });

    // Sort each category by popularity/volume (using symbol patterns as a proxy)
    Object.keys(grouped).forEach((category) => {
      grouped[category].sort((a, b) => {
        // Major forex pairs should come first in FOREX category
        if (category === "FOREX") {
          const majorPairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"];
          const aIsMajor = majorPairs.some((pair) => a.symbol.startsWith(pair));
          const bIsMajor = majorPairs.some((pair) => b.symbol.startsWith(pair));
          if (aIsMajor && !bIsMajor) return -1;
          if (!aIsMajor && bIsMajor) return 1;
        }

        // Major crypto pairs should come first in CRYPTOCURRENCIES category
        if (category === "CRYPTOCURRENCIES") {
          const majorCryptos = ["BTC", "ETH", "BNB", "XRP", "ADA", "DOT", "SOL"];
          const aIsMajor = majorCryptos.some((crypto) => a.symbol.includes(crypto));
          const bIsMajor = majorCryptos.some((crypto) => b.symbol.includes(crypto));
          if (aIsMajor && !bIsMajor) return -1;
          if (!aIsMajor && bIsMajor) return 1;
        }

        // Default to alphabetical sorting by display name
        return a.displayName.localeCompare(b.displayName);
      });
    });

    return grouped;
  }, []);

  // Get pairs to display
  const displayPairs = React.useMemo(() => {
    // When searching, just use the search results
    if (searching) {
      return pairs;
    }

    // For watchlist, use the dedicated watchlist pairs data from our query
    if (selectedCategory === "WATCHLIST") {
      return watchlistPairsData;
    }

    // For other categories, use regular pairs with category filtering
    const grouped = groupAndSortPairs(pairs);
    return grouped[selectedCategory] || [];
  }, [searching, selectedCategory, pairs, watchlistPairsData, groupAndSortPairs]);

  // Update pairs ONLY when category data changes (not for watchlist)
  React.useEffect(() => {
    // Skip updates for watchlist - we'll handle that in the displayPairs memo
    if (selectedCategory !== "WATCHLIST" && categoryPairs.length > 0) {
      console.log(`Using category data: ${categoryPairs.length} pairs for ${selectedCategory}`);
      setPairs(categoryPairs);
    }
  }, [categoryPairs, selectedCategory]);

  // Reset to initial state when dialog closes
  React.useEffect(() => {
    if (!open) {
      console.log("Dialog closing, resetting state");
      setSearchQuery("");
      setHasMore(true);
      setCategoryPage({});
    }
  }, [open]);

  // Handle scrolling to load more items
  React.useEffect(() => {
    const scrollElement = scrollContainerRef.current;
    if (!scrollElement) return;

    const handleScroll = async () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;

      // If we're near the bottom (within 100px), load more items
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        // Only load more if we have more to show and we're not already fetching
        if (!isFetchingMore && hasMore && selectedCategory !== "WATCHLIST" && !searching) {
          await loadPairs(connectionId || "", (categoryPage[selectedCategory] || 0) * BATCH_SIZE);
        }
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [isFetchingMore, hasMore, selectedCategory, searching, connectionId, loadPairs, categoryPage]);

  // Updated search function to use the direct API
  React.useEffect(() => {
    if (!open || searchQuery.length < 2) return;

    console.log("Search effect triggered:", { searchQuery });
    const searchTimeout: NodeJS.Timeout = setTimeout(async () => {
      setSearching(true);
      try {
        console.log(`Searching for trading pairs: "${searchQuery}"`);
        // Use the direct search API instead of the broker-specific one
        const results = await api.searchPairsDirect(searchQuery);
        console.log(`Found ${results.length} matching pairs:`, results.map((p) => p.symbol).join(", "));
        setPairs(results);
      } catch (err) {
        console.error("Error searching pairs:", err);
        toast.error("Error searching pairs. Please try again.");
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      clearTimeout(searchTimeout);
    };
  }, [searchQuery, open, api]);

  // Simplified category change function
  const handleCategoryChange = React.useCallback(
    (category: string) => {
      if (category === selectedCategory) return;

      console.log("Changing category from", selectedCategory, "to", category);

      // Batch our state updates to reduce renders
      ReactDOM.flushSync(() => {
        setSearchQuery(""); // Clear search when changing categories
        setSelectedCategory(category);

        // Reset search state when changing categories
        if (searching) {
          setSearching(false);
        }
      });
    },
    [selectedCategory, searching]
  );

  // Toggle favorite status for a pair
  const toggleFavorite = (symbol: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the parent button click

    if (favorites.includes(symbol)) {
      // Remove from favorites
      removeFromWatchlistMutation.mutate(symbol);
    } else {
      // Add to favorites if under limit
      if (favorites.length >= favoriteLimit) {
        toast.error(`You've reached your limit of ${favoriteLimit} pairs with your ${subscriptionPlan} plan.`);
        return;
      }
      addToWatchlistMutation.mutate(symbol);
    }
  };

  // Handle the display of the watchlist in the results area
  const isCurrentCategoryLoading = ((isLoadingWatchlist || isLoadingWatchlistPairs) && selectedCategory === "WATCHLIST") || (isCategoryLoading && selectedCategory !== "WATCHLIST");

  return (
    <>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
        disabled={disabled || isLoading}
        onClick={() => setOpen(true)}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : value ? (
          <span className="flex items-center gap-2 max-w-full overflow-hidden">
            <Badge variant="outline" className="font-mono shrink-0">
              {selectedPair?.symbol}
            </Badge>
            <span className="truncate">{selectedPair?.displayName || "Unknown pair"}</span>
          </span>
        ) : (
          "Select trading pair..."
        )}
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <DialogTitle>
              Select Trading Pair
              {selectedCategory === "WATCHLIST" && <span className="text-sm font-normal text-slate-500 ml-2">({favorites.length} saved)</span>}
            </DialogTitle>
            <button className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          <div className="px-4 pb-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search by symbol or name..."
                className="pl-8 bg-white dark:bg-slate-950"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
              />
              {searchQuery && (
                <button className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-900" onClick={() => setSearchQuery("")}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Asset class tabs - scrollable container */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex overflow-x-auto py-1 px-4 gap-4 styled-scrollbar">
              {Object.entries(ASSET_CATEGORIES).map(([value, label]) => (
                <button
                  key={value}
                  className={cn(
                    "px-1 py-1.5 text-sm whitespace-nowrap transition-colors font-medium flex items-center",
                    selectedCategory === value
                      ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
                  )}
                  onClick={() => handleCategoryChange(value)}
                  disabled={categoryLoading[value]}>
                  {value === "WATCHLIST" && <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                  {label}
                  {value === "WATCHLIST" && favorites.length > 0 && <span className="ml-1 text-xs opacity-70">({favorites.length})</span>}
                  {categoryLoading[value] && <Loader2 className="ml-1.5 h-3 w-3 animate-spin" />}
                </button>
              ))}
            </div>

            {/* Watchlist usage indicator - only show current usage */}
            {selectedCategory === "WATCHLIST" && (
              <div className="text-xs text-slate-500 pb-1 px-4 flex justify-end">
                <span className="font-medium">
                  {favorites.length}/{favoriteLimit} used
                </span>
              </div>
            )}
          </div>

          {/* Results area */}
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto styled-scrollbar"
            style={{
              height: "auto",
              maxHeight: "min(400px, calc(90vh - 200px))",
              minHeight: "250px",
            }}>
            {searching ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-500" />
                <p className="text-sm text-slate-500">Searching for trading pairs...</p>
              </div>
            ) : isCurrentCategoryLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-500" />
                <p className="text-sm text-slate-500">
                  {selectedCategory === "WATCHLIST" ? "Loading your watchlist items..." : `Loading ${ASSET_CATEGORIES[selectedCategory] || "instruments"}...`}
                </p>
              </div>
            ) : displayPairs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                {selectedCategory === "WATCHLIST" ? (
                  <>
                    <p className="text-slate-500 dark:text-slate-400">No favorite pairs yet</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add pairs to your watchlist by clicking the star icon</p>
                  </>
                ) : searching ? (
                  <>
                    <p className="text-slate-500 dark:text-slate-400">No matches found</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <p className="text-slate-500 dark:text-slate-400">No trading pairs found in this category</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Capital.com offers 3,500+ instruments across different categories</p>
                  </>
                )}
              </div>
            ) : (
              <div className="py-1">
                {displayPairs.map((pair) => (
                  <div
                    key={pair.symbol}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-2 transition-colors",
                      value === pair.symbol ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    )}>
                    <button
                      className="flex-1 flex items-center gap-3 text-left"
                      onClick={() => {
                        onChange(pair.symbol);
                        setOpen(false);
                      }}>
                      <div
                        className={cn(
                          "w-1.5 h-8 rounded-sm",
                          pair.type === "COMMODITIES" || pair.type?.toUpperCase() === "COMMODITY"
                            ? "bg-yellow-500"
                            : pair.type === "CRYPTOCURRENCIES" || pair.type?.toUpperCase() === "CRYPTOCURRENCY"
                            ? "bg-purple-500"
                            : pair.type === "FOREX" || pair.type?.toUpperCase() === "CURRENCIES"
                            ? "bg-green-500"
                            : pair.type === "INDICES" || pair.type?.toUpperCase() === "INDEX"
                            ? "bg-blue-500"
                            : "bg-red-500" // Shares/Stocks
                        )}
                      />
                      <div>
                        <div className="font-medium">{pair.displayName}</div>
                        <div className="text-xs text-slate-500 font-mono">{pair.symbol}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        className={cn(
                          "p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                          addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                        onClick={(e) => toggleFavorite(pair.symbol, e)}
                        disabled={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
                        aria-label={favorites.includes(pair.symbol) ? "Remove from favorites" : "Add to favorites"}>
                        <Star className={cn("h-5 w-5", favorites.includes(pair.symbol) ? "text-yellow-500 fill-yellow-500" : "text-slate-300 dark:text-slate-600")} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isFetchingMore && (
                  <div className="py-2 px-4 text-xs text-center text-slate-500">
                    <div className="w-full flex flex-col items-center justify-center pt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500 mb-1" />
                      <span>Loading more instruments...</span>
                    </div>
                  </div>
                )}

                {/* End of list indicator */}
                {!isFetchingMore && !hasMore && displayPairs.length > 0 && <div className="py-2 px-4 text-xs text-center text-slate-500">No more instruments to load</div>}

                {/* Loading indicator for fetching more or refreshing */}
                {!searching && !isLoadingWatchlist && !isCategoryLoading && isCategoryFetching && (
                  <div className="py-2 text-center">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2 text-blue-500" />
                    <span className="text-xs text-slate-500">Updating data...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
