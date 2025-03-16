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
import axios from "axios";
import { debounce } from "lodash";

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

  // Crypto mappings
  CRYPTOCURRENCIES: "CRYPTOCURRENCIES",
  CRYPTOCURRENCY: "CRYPTOCURRENCIES",
  CRYPTO: "CRYPTOCURRENCIES",
  CRYPTO_PAIR: "CRYPTOCURRENCIES",
  BITCOIN: "CRYPTOCURRENCIES",
  ALTCOIN: "CRYPTOCURRENCIES",

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
const getInstrumentCategory = (type: string | undefined): string | null => {
  if (!type) return null;

  // First try exact match in uppercase
  const upperType = type.toUpperCase();
  if (INSTRUMENT_TYPE_TO_CATEGORY[upperType]) {
    return INSTRUMENT_TYPE_TO_CATEGORY[upperType];
  }

  // Try substring matches if no exact match
  // Words that strongly indicate a specific category
  const categoryKeywords: Record<string, string[]> = {
    FOREX: ["FX", "CURRENCY", "CURRENCIES", "FOREX"],
    CRYPTOCURRENCIES: ["CRYPTO", "BITCOIN", "ETH", "BTC", "COIN"],
    SHARES: ["SHARE", "STOCK", "EQUITY"],
    INDICES: ["INDEX", "INDICE"],
    COMMODITIES: ["COMMODITY", "OIL", "METAL", "GOLD", "SILVER", "GAS", "ENERGY"],
  };

  // Check if the type contains any of the keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => upperType.includes(keyword))) {
      return category;
    }
  }

  // If nothing matches, use some additional heuristics for specific Capital.com types
  // Create a debug log to see what we're working with
  console.log(`Trying to categorize instrument type: ${type}`);

  // Special case for CURRENCIES which should always be FOREX
  if (upperType === "CURRENCIES") {
    console.log(`Mapping CURRENCIES to FOREX category`);
    return "FOREX";
  }

  console.log(`Unmapped instrument type: ${type}`);
  return null;
};

// Limits based on subscription tier
const FAVORITE_LIMITS: Record<string, number> = {
  Free: 10,
  Pro: 50,
};

export function TradingPairSelect({ value, onChange, pairs: initialPairs, isLoading = false, disabled = false, connectionId }: TradingPairSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pairs, setPairs] = React.useState<TradingPair[]>(initialPairs);
  const [loadedCategories, setLoadedCategories] = React.useState<string[]>(["WATCHLIST"]);
  const [categoryLoading, setCategoryLoading] = React.useState<Record<string, boolean>>({});
  const [searching, setSearching] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState("WATCHLIST");
  const [hasMore, setHasMore] = React.useState(true);
  const [categoryPage, setCategoryPage] = React.useState<Record<string, number>>({});
  const [isFetchingMore, setIsFetchingMore] = React.useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const api = useApi();
  const { profile } = useSettings();
  const queryClient = useQueryClient();

  const subscriptionPlan = profile?.subscriptionPlan || "Free";
  const favoriteLimit = FAVORITE_LIMITS[subscriptionPlan] || FAVORITE_LIMITS.Free;

  // Load watchlist from API instead of localStorage
  const { data: watchlist = [], isLoading: isLoadingWatchlist } = useQuery({
    queryKey: ["watchlist"],
    queryFn: api.getWatchlist,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Extract just the symbols for easier checking
  const favorites = React.useMemo(() => watchlist.map((item) => item.symbol), [watchlist]);

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: (symbol: string) => api.addToWatchlist(symbol, connectionId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Added to watchlist");
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 403) {
        toast.error(`Watchlist limit reached (${favoriteLimit} items)`);
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

  // Update pairs when initialPairs changes
  React.useEffect(() => {
    console.log(`Initial pairs updated: ${initialPairs.length} pairs`);
    setPairs(initialPairs);
  }, [initialPairs]);

  // Reset to initial state when dialog closes
  React.useEffect(() => {
    if (!open) {
      console.log("Dialog closing, resetting state");
      setSearchQuery("");
      setHasMore(true);
      setCategoryPage({});
    }
  }, [open]);

  // Group pairs by category
  const groupedPairs = React.useMemo(() => {
    const grouped: Record<string, TradingPair[]> = {};

    // Initialize all categories with empty arrays
    Object.keys(ASSET_CATEGORIES).forEach((category) => {
      grouped[category] = [];
    });

    // Add pairs to their respective categories
    pairs.forEach((pair) => {
      // Special handling for Capital.com's CURRENCIES type
      if (pair.type === "CURRENCIES") {
        grouped["FOREX"].push(pair);
        return;
      }

      // Map the API instrument type to our category system
      const category = getInstrumentCategory(pair.type);

      if (category && grouped[category]) {
        grouped[category].push(pair);
      }
    });

    // Add favorites to the watchlist from all pairs
    if (favorites.length > 0) {
      // Find pairs matching the favorites
      const watchlistPairs = pairs.filter((pair) => favorites.includes(pair.symbol));
      grouped.WATCHLIST = watchlistPairs;
    }

    return grouped;
  }, [pairs, favorites]);

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
          await loadMoreForCategory(selectedCategory);
        }
      }
    };

    scrollElement.addEventListener("scroll", handleScroll);
    return () => scrollElement.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, selectedCategory, hasMore, isFetchingMore, searching]);

  // Debounced search
  React.useEffect(() => {
    if (!connectionId || !open) return;

    const handler = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        try {
          console.log(`Searching for trading pairs: "${searchQuery}"`);
          const results = await api.getTradingPairs(connectionId, searchQuery, 100);
          console.log(`Found ${results.length} matching pairs`);
          setPairs(results);
        } catch (err) {
          console.error("Error searching pairs:", err);
          if (axios.isAxiosError(err) && err.response?.status === 429) {
            toast.error("Too many requests. Please wait a moment before searching again.");
          }
        } finally {
          setSearching(false);
        }
      } else if (searchQuery.length === 0) {
        console.log("Search cleared, restoring category pairs");
        setSearching(false);

        // If we're in a specific category, reload that category's data
        if (selectedCategory !== "WATCHLIST" && loadedCategories.includes(selectedCategory)) {
          try {
            // Add a small delay before reloading to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log(`Reloading pairs for category: ${selectedCategory}`);
            const results = await api.getTradingPairs(connectionId, "", 100, selectedCategory, 0);
            console.log(`Restored ${results.length} pairs for category ${selectedCategory}`);
            setPairs(results);
            setHasMore(results.length === 100);
            setCategoryPage({ [selectedCategory]: 0 });
          } catch (error) {
            console.error(`Error restoring category pairs:`, error);
            if (axios.isAxiosError(error) && error.response?.status === 429) {
              // If we hit rate limit, try again after a delay
              console.log("Rate limit hit, retrying after delay...");
              setTimeout(async () => {
                try {
                  const results = await api.getTradingPairs(connectionId, "", 100, selectedCategory, 0);
                  setPairs(results);
                  setHasMore(results.length === 100);
                  setCategoryPage({ [selectedCategory]: 0 });
                } catch (retryError) {
                  console.error("Retry failed:", retryError);
                  toast.error("Failed to load category data. Please try again.");
                }
              }, 2000);
            }
          }
        } else if (selectedCategory === "WATCHLIST") {
          // For watchlist, restore initial pairs
          console.log("Restoring initial pairs for watchlist");
          setPairs(initialPairs);
        }
      }
    }, 500); // Increased debounce time from 300ms to 500ms

    return () => clearTimeout(handler);
  }, [searchQuery, connectionId, initialPairs, open, api, selectedCategory, loadedCategories]);

  // Function to load more items for the selected category
  const loadMoreForCategory = async (category: string) => {
    if (!connectionId || isFetchingMore || !hasMore || category === "WATCHLIST") {
      return;
    }

    setIsFetchingMore(true);

    try {
      // Get current page for this category
      const currentPage = categoryPage[category] || 0;
      const offset = currentPage * 100; // Use 100 items per page

      console.log(`Loading more data for category ${category}, offset ${offset}`);

      const results = await api.getTradingPairs(connectionId, "", 100, category, offset);
      console.log(`Received ${results.length} additional instruments for category ${category}`);

      // If we get less than 100 results, we've reached the end
      if (results.length < 100) {
        setHasMore(false);
      }

      // Merge with existing pairs, avoid duplicates
      setPairs((prev) => {
        const existingSymbols = new Set(prev.map((p) => p.symbol));
        const newPairs = results.filter((p) => !existingSymbols.has(p.symbol));
        return [...prev, ...newPairs];
      });

      // Update the page number for this category
      setCategoryPage((prev) => ({
        ...prev,
        [category]: currentPage + 1,
      }));
    } catch (error) {
      console.error(`Error loading more items for category ${category}:`, error);
      toast.error(`Failed to load more ${ASSET_CATEGORIES[category] || category} instruments`);
      setHasMore(false);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // Load category data when a category is selected
  const loadCategoryData = async (category: string) => {
    if (loadedCategories.includes(category) || category === "WATCHLIST" || !connectionId) {
      console.log(`Skipping category load - already loaded: ${category}`);
      return;
    }

    console.log(`Loading category data for: ${category}`);
    setCategoryLoading((prev) => ({ ...prev, [category]: true }));
    setHasMore(true);
    setCategoryPage((prev) => ({ ...prev, [category]: 0 }));

    const loadWithRetry = async (retryCount = 0) => {
      try {
        console.log(`Fetching initial data for category: ${category}`);
        const results = await api.getTradingPairs(connectionId, "", 100, category, 0);
        console.log(`Received ${results.length} instruments for category ${category}`);

        if (results.length < 100) {
          console.log(`No more pages available for category ${category}`);
          setHasMore(false);
        }

        setPairs(results);
        setLoadedCategories((prev) => [...prev, category]);
      } catch (error) {
        console.error(`Error loading category ${category}:`, error);

        if (axios.isAxiosError(error) && error.response?.status === 429 && retryCount < 2) {
          console.log(`Rate limit hit, retrying (attempt ${retryCount + 1})...`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * (retryCount + 1)));
          return loadWithRetry(retryCount + 1);
        }

        toast.error(`Failed to load ${ASSET_CATEGORIES[category] || category} instruments`);
        setHasMore(false);
      }
    };

    try {
      await loadWithRetry();
    } finally {
      setCategoryLoading((prev) => ({ ...prev, [category]: false }));
    }
  };

  // Handle category change with debounce
  const debouncedCategoryChange = React.useCallback(
    debounce((category: string) => {
      console.log(`Changing category to: ${category}`);
      setSelectedCategory(category);
      setHasMore(true);
      setSearchQuery(""); // Clear search when changing categories

      // Load category data if not loaded yet
      if (!loadedCategories.includes(category) && category !== "WATCHLIST") {
        loadCategoryData(category);
      } else if (category === "WATCHLIST") {
        // For watchlist, restore initial pairs
        console.log("Restoring initial pairs for watchlist category");
        setPairs(initialPairs);
      }
    }, 500),
    [loadedCategories, loadCategoryData, initialPairs]
  );

  // Handle category change
  const handleCategoryChange = (category: string) => {
    debouncedCategoryChange(category);
  };

  // Toggle favorite status for a pair
  const toggleFavorite = (symbol: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the parent button click

    if (favorites.includes(symbol)) {
      // Remove from favorites
      removeFromWatchlistMutation.mutate(symbol);
    } else {
      // Add to favorites if under limit
      if (favorites.length >= favoriteLimit) {
        toast.error(`You can only add ${favoriteLimit} pairs to your watchlist with your ${subscriptionPlan} plan`);
        return;
      }
      addToWatchlistMutation.mutate(symbol);
    }
  };

  // Get pairs to display
  const displayPairs = React.useMemo(() => {
    if (searching) {
      return pairs;
    }
    return groupedPairs[selectedCategory] || [];
  }, [searching, selectedCategory, groupedPairs, pairs]);

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

            {/* Watchlist limit indicator */}
            {selectedCategory === "WATCHLIST" && (
              <div className="text-xs text-slate-500 pb-1 px-4 flex justify-between">
                <span>Free users: 10 pairs</span>
                <span>Pro users: 50 pairs</span>
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
            ) : isLoadingWatchlist && selectedCategory === "WATCHLIST" ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-500" />
                <p className="text-sm text-slate-500">Loading your watchlist...</p>
              </div>
            ) : selectedCategory !== "WATCHLIST" && !loadedCategories.includes(selectedCategory) ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-blue-500" />
                <p className="text-sm text-slate-500">Loading {ASSET_CATEGORIES[selectedCategory] || "instruments"}...</p>
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
                  <button
                    key={pair.symbol}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-2 text-left transition-colors",
                      value === pair.symbol ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    )}
                    onClick={() => {
                      onChange(pair.symbol);
                      setOpen(false);
                    }}>
                    <div className="flex items-center gap-3">
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
                    </div>
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
                  </button>
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
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
