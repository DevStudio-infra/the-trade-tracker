"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingStore } from "@/stores/trading-store";
import { useAITradingApi } from "@/lib/ai-trading-api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BrainCircuit, Loader2, Trash2, StopCircle, PlayCircle, RefreshCcw } from "lucide-react";
import { createIndicator } from "@/components/trading/chart/indicators/indicatorFactory";
import { useIndicatorStore } from "@/components/trading/chart/indicators/indicatorStore";
import { IndicatorParameters } from "@/components/trading/chart/core/ChartTypes";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Table } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getCurrentUserId } from "@/lib/auth";

// Update AITradingConfig type
declare module "@/stores/trading-store" {
  interface AITradingConfig {
    timeframe: string;
  }
}

// Add BotStatus interface
interface BotStatus {
  id: string | null;
  isActive: boolean;
  lastCheck: Date | null;
  lastTrade: Date | null;
  pair?: string;
  timeframe?: string;
  strategyId?: string;
  dailyStats: {
    tradesExecuted: number;
    winRate: number;
    profitLoss: number;
  };
  errors: string[];
}

// Add Trade interface
interface Trade {
  id: string;
  pair: string;
  entryPrice: number;
  exitPrice?: number;
  profitLoss?: number;
  createdAt: string;
  closedAt?: string;
  type: "BUY" | "SELL";
  status: "OPEN" | "CLOSED";
}

// Add AIEvaluation interface
interface AIEvaluation {
  id: string;
  signalId: string;
  botInstanceId: string;
  evalType: string;
  chartImageUrl: string;
  promptUsed: string;
  llmResponse: LLMResponse;
  createdAt: string;
}

// Add LLMResponse interface
interface LLMResponse {
  decision: string;
  confidence: number;
  reasoning: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface AITradingConfigProps {
  showOnlyActiveBots?: boolean;
}

export function AITradingConfig({ showOnlyActiveBots = false }: AITradingConfigProps) {
  const { aiTradingConfig, updateAITradingConfig, selectedBroker, selectedPair } = useTradingStore();
  const { addIndicator, clearAllIndicators } = useIndicatorStore();
  const aiTradingApi = useAITradingApi();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isTogglingBot, setIsTogglingBot] = useState(false);
  const [error, setError] = useState("");
  const [botToDelete, setBotToDelete] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<BotStatus | null>(null);
  const [showBotDetails, setShowBotDetails] = useState(false);
  const [bots, setBots] = useState<BotStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch strategies
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: async () => {
      const result = await aiTradingApi.getStrategies();
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all bots
  const fetchBots = async () => {
    try {
      setIsLoading(true);
      const userId = await getCurrentUserId();
      const response = await fetch(`${API_URL}/trading/bot/all`, {
        headers: {
          "Content-Type": "application/json",
          "dev-auth": "true",
          "x-user-id": userId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bots: ${response.statusText}`);
      }

      const data = await response.json();
      setBots(data);
    } catch (error) {
      console.error("Error fetching bots:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch trading bots");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch bots when component mounts
  useEffect(() => {
    fetchBots();

    // Set up an interval to refresh bots every 5 minutes
    const intervalId = setInterval(fetchBots, 5 * 60 * 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Load strategy indicators
  const loadStrategyIndicators = useCallback(
    (strategyId: string | null) => {
      // Clear existing indicators first
      clearAllIndicators();

      if (!strategyId) return;

      // Find the selected strategy
      const strategy = strategies.find((s) => s.id === strategyId);
      if (!strategy || !strategy.rules?.indicators) return;

      // Create a single update batch
      const indicatorsToAdd = Object.entries(strategy.rules.indicators)
        .filter(([type]) => !document.querySelector(`[data-indicator-id="${type}"]`))
        .map(([type, config]) => {
          try {
            const params: IndicatorParameters =
              typeof config === "number" ? { period: config } : typeof config === "string" ? { period: parseInt(config, 10) } : (config as IndicatorParameters);

            return createIndicator(type, params);
          } catch (error) {
            console.error(`Error creating indicator ${type}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      // Add all indicators in one batch
      if (indicatorsToAdd.length > 0) {
        indicatorsToAdd.forEach((indicator) => {
          if (indicator) addIndicator(indicator);
        });

        // Single chart refresh after all indicators are added
        requestAnimationFrame(() => {
          if (selectedBroker && selectedPair) {
            window.dispatchEvent(
              new CustomEvent("forceChartRefresh", {
                detail: {
                  pair: selectedPair,
                  brokerId: selectedBroker.id,
                  timeframe: aiTradingConfig.timeframe || "1h",
                  skipIndicatorCheck: true,
                },
              })
            );
          }
        });
      }
    },
    [strategies, addIndicator, clearAllIndicators, selectedBroker, selectedPair, aiTradingConfig.timeframe]
  );

  // Add cleanup effect with proper indicator cleanup
  useEffect(() => {
    const cleanup = () => {
      clearAllIndicators();
      // Clear any debounce timers
      Object.keys(window).forEach((key) => {
        if (key.startsWith("load-indicators-")) {
          delete (window as unknown as Record<string, unknown>)[key];
        }
      });
    };

    // Clean up on unmount
    return cleanup;
  }, [clearAllIndicators]);

  // Create a new bot
  const createBot = async () => {
    if (!strategy || !timeframe) {
      setError("Please select a strategy and timeframe");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const userId = await getCurrentUserId();
      const response = await fetch(`${API_URL}/trading/bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "dev-auth": "true",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          pair: "BTCUSDT",
          timeframe,
          strategyId: strategy,
          riskSettings: {
            maxRiskPerTrade: 2, // Default value instead of slider
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const botData = await response.json();
      console.log("Bot created:", botData);

      // Start the bot
      await toggleBot(botData.id, false);

      // Clear inputs
      setStrategy("");
      setTimeframe("");
    } catch (error: unknown) {
      console.error("Error creating bot:", error);
      setError(`Failed to create bot: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle an existing bot
  const toggleBot = async (botId: string, isActive: boolean) => {
    try {
      setIsTogglingBot(true);
      const userId = await getCurrentUserId();
      const action = isActive ? "stop" : "start";
      const response = await fetch(`${API_URL}/trading/bot/${botId}/${action}`, {
        method: "POST",
        headers: {
          "dev-auth": "true",
          "x-user-id": userId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} bot: ${response.statusText}`);
      }

      toast.success(`Trading bot ${action}ed`);
      queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
    } catch (error) {
      console.error(`Error ${isActive ? "stopping" : "starting"} bot:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isActive ? "stop" : "start"} trading bot`);
    } finally {
      setIsTogglingBot(false);
    }
  };

  // Delete a bot
  const deleteBot = async (botId: string) => {
    try {
      setIsDeleting(botId);
      const userId = await getCurrentUserId();
      const response = await fetch(`${API_URL}/trading/bot/${botId}`, {
        method: "DELETE",
        headers: {
          "dev-auth": "true",
          "x-user-id": userId,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete bot: ${response.statusText}`);
      }

      toast.success("Trading bot deleted");
      queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
    } catch (error) {
      console.error("Error deleting bot:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete trading bot");
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle strategy selection
  const handleStrategyChange = (value: string) => {
    setStrategy(value);
    updateAITradingConfig({ selectedStrategyId: value || null });

    // Use RAF to ensure we're not in a tight loop
    requestAnimationFrame(() => {
      loadStrategyIndicators(value || null);
    });
  };

  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    setTimeframe(value);
    updateAITradingConfig({ timeframe: value });
  };

  // Function to open bot details
  const handleBotClick = (bot: BotStatus) => {
    setSelectedBot(bot);
    setShowBotDetails(true);
  };

  const botTableRow = (bot: BotStatus) => (
    <TableRow
      key={bot.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={(e) => {
        // Prevent clicks on action buttons from opening the details
        if ((e.target as Element).closest("button")) return;
        handleBotClick(bot);
      }}>
      <TableCell>
        <Badge variant={bot.isActive ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
          {bot.isActive ? (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Active
            </>
          ) : (
            "Inactive"
          )}
        </Badge>
      </TableCell>
      <TableCell>{bot.pair || "BTCUSDT"}</TableCell>
      <TableCell>{bot.timeframe}</TableCell>
      <TableCell>{bot.strategyId?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown"}</TableCell>
      <TableCell>
        {bot.lastCheck
          ? formatDistanceToNow(new Date(bot.lastCheck), {
              addSuffix: true,
            })
          : "Not started"}
      </TableCell>
      <TableCell className="text-right">{bot.dailyStats?.winRate !== undefined ? `${Math.round(bot.dailyStats.winRate * 100)}%` : "N/A"}</TableCell>
      <TableCell className="text-right">
        {bot.dailyStats?.profitLoss !== undefined ? `${bot.dailyStats.profitLoss > 0 ? "+" : ""}${bot.dailyStats.profitLoss.toFixed(2)}%` : "N/A"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant={bot.isActive ? "destructive" : "default"}
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // Prevent opening details
              toggleBot(bot.id!, bot.isActive);
            }}
            disabled={isTogglingBot}
            className="h-8 px-3">
            {bot.isActive ? <StopCircle className="h-4 w-4 mr-1" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            {bot.isActive ? "Stop" : "Start"}
          </Button>

          {!bot.isActive && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialog open={botToDelete === bot.id} onOpenChange={(isOpen: boolean) => !isOpen && setBotToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening details
                          setBotToDelete(bot.id!);
                        }}
                        disabled={isDeleting === bot.id}
                        className="h-8 px-3">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trading Bot</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this trading bot? This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteBot(bot.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {isDeleting === bot.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            "Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete bot</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Add renderBotTable function
  const renderBotTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Pair</TableHead>
          <TableHead>Timeframe</TableHead>
          <TableHead>Strategy</TableHead>
          <TableHead>Last Check</TableHead>
          <TableHead className="text-right">Win Rate</TableHead>
          <TableHead className="text-right">P/L</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>{bots.map((bot) => botTableRow(bot))}</TableBody>
    </Table>
  );

  // Render function for the table that includes both the table rows and the bot details dialog
  const renderBotTableWithDetails = () => (
    <>
      <div className="overflow-x-auto">{renderBotTable()}</div>

      {/* Bot Details Dialog */}
      <Dialog open={showBotDetails} onOpenChange={setShowBotDetails}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Bot Details</DialogTitle>
            <DialogDescription>View detailed information about this trading bot</DialogDescription>
          </DialogHeader>
          {selectedBot && <BotDetailsView bot={selectedBot} />}
        </DialogContent>
      </Dialog>
    </>
  );

  // Render only the active bots section if showOnlyActiveBots is true
  if (showOnlyActiveBots) {
    return (
      <div className="w-full">
        {/* Active Trading Bots Section */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
                <CardTitle className="text-xl">Active Trading Bots</CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
                }}
                className="h-8">
                <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
            <CardDescription>Monitor and manage your automated trading bots</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : bots.length > 0 ? (
              renderBotTableWithDetails()
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No active trading bots found</p>
                <p className="text-sm">Configure and start a bot to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Original implementation for the full component
  return (
    <div className="w-full space-y-6">
      {/* Create Bot Section */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center mb-2">
            <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
            <CardTitle className="text-xl">Create Trading Bot</CardTitle>
          </div>
          <CardDescription>Configure and launch an automated trading bot</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="strategy" className="text-sm font-medium mb-1 block">
                  Trading Strategy
                </Label>
                <Select value={strategy} onValueChange={handleStrategyChange} disabled={isLoadingStrategies}>
                  <SelectTrigger id="strategy" className="w-full">
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingStrategies ? (
                      <SelectItem value="loading" disabled>
                        <span className="flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                          Loading strategies...
                        </span>
                      </SelectItem>
                    ) : strategies.length > 0 ? (
                      strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        <span className="flex items-center">
                          <AlertCircle className="h-3 w-3 mr-2" />
                          No strategies available
                        </span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeframe" className="text-sm font-medium mb-1 block">
                  Chart Timeframe
                </Label>
                <Select value={timeframe} onValueChange={handleTimeframeChange}>
                  <SelectTrigger id="timeframe" className="w-full">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1m">1 Minute</SelectItem>
                    <SelectItem value="5m">5 Minutes</SelectItem>
                    <SelectItem value="15m">15 Minutes</SelectItem>
                    <SelectItem value="30m">30 Minutes</SelectItem>
                    <SelectItem value="1h">1 Hour</SelectItem>
                    <SelectItem value="4h">4 Hours</SelectItem>
                    <SelectItem value="1d">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <div className="bg-destructive/10 text-destructive p-2 rounded-md text-sm">{error}</div>}

            <Button type="button" onClick={createBot} disabled={isCreating || !strategy || !timeframe} className="w-full">
              {isCreating ? (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create & Start Bot"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Strategy Details Section */}
      {strategy && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Strategy Details</CardTitle>
            <CardDescription>Learn about this trading strategy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {strategy === "rsi_mean_reversion" && (
              <div className="space-y-3">
                <h3 className="font-medium">RSI Mean Reversion Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  This strategy uses the Relative Strength Index (RSI) indicator to identify overbought and oversold conditions in the market, entering trades when price is likely
                  to revert to the mean.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indicators Used</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">RSI</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Trade Logic</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Buy when RSI drops below 30 (oversold)</li>
                    <li>Sell when RSI rises above 70 (overbought)</li>
                    <li>Uses dynamic stop-loss based on recent volatility</li>
                  </ul>
                </div>
              </div>
            )}

            {strategy === "sma_crossover" && (
              <div className="space-y-3">
                <h3 className="font-medium">SMA Crossover Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Uses Simple Moving Average crossovers to identify trend changes and potential entry/exit points. This strategy works well in trending markets.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indicators Used</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">SMA 50</Badge>
                    <Badge variant="secondary">SMA 200</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Trade Logic</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Buy when fast SMA crosses above slow SMA</li>
                    <li>Sell when fast SMA crosses below slow SMA</li>
                    <li>Includes confirmation with volume analysis</li>
                  </ul>
                </div>
              </div>
            )}

            {strategy === "macd_momentum" && (
              <div className="space-y-3">
                <h3 className="font-medium">MACD Momentum Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Uses the Moving Average Convergence Divergence (MACD) indicator to identify momentum shifts and potential trend continuations or reversals.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indicators Used</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">MACD</Badge>
                    <Badge variant="secondary">Signal Line</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Trade Logic</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Buy when MACD crosses above signal line</li>
                    <li>Sell when MACD crosses below signal line</li>
                    <li>Uses histogram for confirmation</li>
                  </ul>
                </div>
              </div>
            )}

            {strategy === "bollinger_breakout" && (
              <div className="space-y-3">
                <h3 className="font-medium">Bollinger Breakout Strategy</h3>
                <p className="text-sm text-muted-foreground">
                  Utilizes Bollinger Bands to identify volatility breakouts and potential trend movements, entering trades when price breaks through the bands.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Indicators Used</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Bollinger Bands</Badge>
                    <Badge variant="secondary">SMA 20</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Trade Logic</h4>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                    <li>Buy when price breaks above upper band</li>
                    <li>Sell when price breaks below lower band</li>
                    <li>Uses volume and band width for confirmation</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Trading Bots Section */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
              <CardTitle className="text-xl">Active Trading Bots</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
              }}
              className="h-8">
              <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
          <CardDescription>Monitor and manage your automated trading bots</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bots.length > 0 ? (
            renderBotTableWithDetails()
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-2">No active trading bots found</p>
              <p className="text-sm">Configure and start a bot to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// BotDetailsView component
function BotDetailsView({ bot }: { bot: BotStatus }) {
  const [activeTab, setActiveTab] = useState<string>("trades");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [evaluations, setEvaluations] = useState<AIEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBotDetails = async () => {
      setIsLoading(true);
      try {
        // Mock trades data
        const mockTrades: Trade[] = [
          {
            id: "trade-1",
            pair: bot.pair || "BTCUSDT",
            entryPrice: 40000,
            exitPrice: 41000,
            profitLoss: 2.5,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            closedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
            type: "BUY",
            status: "CLOSED",
          },
          {
            id: "trade-2",
            pair: bot.pair || "BTCUSDT",
            entryPrice: 39500,
            exitPrice: 39000,
            profitLoss: -1.3,
            createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            closedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
            type: "BUY",
            status: "CLOSED",
          },
          {
            id: "trade-3",
            pair: bot.pair || "BTCUSDT",
            entryPrice: 40500,
            type: "BUY",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: "OPEN",
          },
        ];

        // Mock evaluations data
        const mockEvaluations: AIEvaluation[] = [
          {
            id: "eval-1",
            signalId: "signal-1",
            botInstanceId: bot.id || "",
            evalType: "ENTRY",
            chartImageUrl: "/placeholder-chart.png",
            promptUsed: "Analyze this chart for buy opportunities using RSI strategy",
            llmResponse: {
              decision: "BUY",
              confidence: 0.85,
              reasoning: "RSI is in oversold territory at 29.5, indicating a potential reversal. Price is also finding support at the 50-day moving average.",
            },
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "eval-2",
            signalId: "signal-2",
            botInstanceId: bot.id || "",
            evalType: "EXIT",
            chartImageUrl: "/placeholder-chart.png",
            promptUsed: "Analyze this chart for exit conditions using RSI strategy",
            llmResponse: {
              decision: "SELL",
              confidence: 0.78,
              reasoning: "RSI has reached overbought territory at 72, and price is approaching resistance. Consider taking profits.",
            },
            createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
          },
        ];

        setTrades(mockTrades);
        setEvaluations(mockEvaluations);
      } catch (error) {
        console.error("Error fetching bot details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBotDetails();
  }, [bot.id, bot.pair]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="trades" value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="trades" className="py-2">
            Trade History
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="py-2">
            AI Evaluations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : trades.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry Price</TableHead>
                    <TableHead>Exit Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{new Date(trade.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={trade.type === "BUY" ? "default" : "secondary"}>{trade.type}</Badge>
                      </TableCell>
                      <TableCell>${trade.entryPrice.toLocaleString()}</TableCell>
                      <TableCell>{trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={trade.status === "OPEN" ? "outline" : "secondary"}>{trade.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {trade.profitLoss !== undefined ? (
                          <span className={trade.profitLoss >= 0 ? "text-green-500" : "text-red-500"}>
                            {trade.profitLoss >= 0 ? "+" : ""}
                            {trade.profitLoss.toFixed(2)}%
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trade history available for this bot</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : evaluations.length > 0 ? (
            <div className="space-y-6">
              {evaluations.map((evaluation) => (
                <Card key={evaluation.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{evaluation.evalType === "ENTRY" ? "Entry Evaluation" : "Exit Evaluation"}</CardTitle>
                      <span className="text-sm text-muted-foreground">{new Date(evaluation.createdAt).toLocaleString()}</span>
                    </div>
                    <CardDescription>{evaluation.promptUsed}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">AI Decision</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Decision:</span>
                            <Badge variant={evaluation.llmResponse.decision === "BUY" ? "default" : "secondary"}>{evaluation.llmResponse.decision}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <span className="text-sm font-medium">{Math.round(evaluation.llmResponse.confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-2">Reasoning</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.llmResponse.reasoning}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No AI evaluations available for this bot</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
