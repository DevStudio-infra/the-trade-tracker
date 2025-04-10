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
import { BrainCircuit, Loader2, Play, Activity } from "lucide-react";
import { createIndicator } from "@/components/trading/chart/indicators/indicatorFactory";
import { useIndicatorStore } from "@/components/trading/chart/indicators/indicatorStore";
import { IndicatorParameters } from "@/components/trading/chart/core/ChartTypes";
import { cn } from "@/lib/utils";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Table } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

// Update AITradingConfig type
declare module "@/stores/trading-store" {
  interface AITradingConfig {
    timeframe?: string;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function AITradingConfig() {
  const { aiTradingConfig, updateAITradingConfig, selectedBroker, selectedPair } = useTradingStore();
  const { addIndicator, clearAllIndicators } = useIndicatorStore();
  const aiTradingApi = useAITradingApi();
  const [isTogglingService, setIsTogglingService] = useState(false);
  const [riskSettings] = useState({
    maxRiskPerTrade: 1.0,
    maxDailyLoss: 2.0,
    maxDrawdown: 5.0,
    stopLossPercent: 1.0,
    takeProfitPercent: 2.0,
  });
  const queryClient = useQueryClient();

  // Fetch strategies
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: async () => {
      console.log("AITradingConfig: Fetching strategies...");
      const result = await aiTradingApi.getStrategies();
      console.log("AITradingConfig: Strategies fetched:", result);
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all active bots for the user
  const { data: allBots = [], isLoading: isLoadingBots } = useQuery<BotStatus[]>({
    queryKey: ["all-trading-bots"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/trading/bot/all`);
      if (!response.ok) throw new Error("Failed to fetch all bots");
      return response.json();
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    retry: 3,
    staleTime: 2000,
  });

  // Selected strategy details
  const selectedStrategy = strategies.find((s) => s.id === aiTradingConfig.selectedStrategyId);

  // Load strategy indicators
  const loadStrategyIndicators = useCallback(
    (strategyId: string | null) => {
      console.log("AITradingConfig: Loading indicators for strategy:", strategyId);

      // Clear existing indicators first
      clearAllIndicators();

      if (!strategyId) {
        console.log("AITradingConfig: No strategy ID provided, skipping indicator loading");
        return;
      }

      // Find the selected strategy
      const strategy = strategies.find((s) => s.id === strategyId);
      if (!strategy || !strategy.rules?.indicators) {
        console.log("AITradingConfig: No valid strategy or indicators found");
        return;
      }

      // Create a single update batch
      const indicatorsToAdd = Object.entries(strategy.rules.indicators)
        .filter(([type]) => !document.querySelector(`[data-indicator-id="${type}"]`))
        .map(([type, config]) => {
          try {
            const params: IndicatorParameters =
              typeof config === "number" ? { period: config } : typeof config === "string" ? { period: parseInt(config, 10) } : (config as IndicatorParameters);

            return createIndicator(type, params);
          } catch (error) {
            console.error(`AITradingConfig: Error creating indicator ${type}:`, error);
            return null;
          }
        })
        .filter(Boolean);

      // Add all indicators in one batch
      if (indicatorsToAdd.length > 0) {
        indicatorsToAdd.forEach((indicator) => {
          if (indicator) {
            addIndicator(indicator);
          }
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
                  skipIndicatorCheck: true, // Add this flag to prevent recursive checks
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
    if (!selectedBroker || !selectedPair || !aiTradingConfig.selectedStrategyId) {
      toast.error("Please select a broker, trading pair, and strategy first");
      return;
    }

    if (isTogglingService) return;

    setIsTogglingService(true);
    try {
      // Use strategy's risk parameters if available
      const strategyRiskSettings = selectedStrategy?.riskParameters || {};

      const requestBody = {
        strategyId: aiTradingConfig.selectedStrategyId,
        pair: selectedPair,
        timeframe: aiTradingConfig.timeframe || "1h",
        riskSettings: {
          maxRiskPerTrade: strategyRiskSettings.maxRiskPercent || riskSettings.maxRiskPerTrade,
          stopLossPercent: strategyRiskSettings.stopLossMultiplier || riskSettings.stopLossPercent,
          takeProfitPercent: strategyRiskSettings.takeProfitMultiplier || riskSettings.takeProfitPercent,
        },
      };

      console.log("Creating bot with data:", JSON.stringify(requestBody, null, 2));

      try {
        const response = await fetch(`${API_URL}/trading/bot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(requestBody),
          cache: "no-cache",
          credentials: "same-origin",
        });

        const responseText = await response.text();
        console.log("Response status:", response.status);
        console.log("Response text:", responseText);

        if (!response.ok) {
          throw new Error(`Failed to create bot: ${response.statusText} - ${responseText}`);
        }

        const botData = response.status !== 204 ? JSON.parse(responseText) : {};

        const startResponse = await fetch(`${API_URL}/trading/bot/${botData.id}/start`, {
          method: "POST",
        });

        if (!startResponse.ok) {
          throw new Error(`Failed to start bot: ${startResponse.statusText}`);
        }

        toast.success("Trading bot created and started");
        queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
      } catch (error) {
        console.error("Error creating bot:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error creating bot:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create trading bot");
    } finally {
      setIsTogglingService(false);
    }
  };

  // Toggle an existing bot
  const toggleBot = async (botId: string, isActive: boolean) => {
    try {
      const action = isActive ? "stop" : "start";
      const response = await fetch(`${API_URL}/trading/bot/${botId}/${action}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} bot: ${response.statusText}`);
      }

      toast.success(`Trading bot ${action}ed`);
      queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
    } catch (error) {
      console.error(`Error ${isActive ? "stopping" : "starting"} bot:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isActive ? "stop" : "start"} trading bot`);
    }
  };

  // Handle strategy selection
  const handleStrategyChange = (value: string) => {
    console.log("AITradingConfig: Strategy selected:", value);
    updateAITradingConfig({ selectedStrategyId: value || null });

    // Use RAF to ensure we're not in a tight loop
    requestAnimationFrame(() => {
      loadStrategyIndicators(value || null);
    });
  };

  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    updateAITradingConfig({ timeframe: value });
  };

  const isConfigured = selectedBroker && selectedPair && aiTradingConfig.selectedStrategyId && aiTradingConfig.timeframe;

  return (
    <div className="space-y-6">
      {/* Bot Creation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6" />
            <span>AI Trading Bot</span>
          </CardTitle>
          <CardDescription>Create and manage automated trading bots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Column - Options */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="strategy" className="mb-1 block">
                  Trading Strategy
                </Label>
                <Select value={aiTradingConfig.selectedStrategyId || ""} onValueChange={handleStrategyChange} disabled={isLoadingStrategies}>
                  <SelectTrigger id="strategy">
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingStrategies ? (
                      <SelectItem value="loading" disabled>
                        Loading strategies...
                      </SelectItem>
                    ) : strategies.length > 0 ? (
                      strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No strategies available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timeframe" className="mb-1 block">
                  Chart Timeframe
                </Label>
                <Select value={aiTradingConfig.timeframe || "1h"} onValueChange={handleTimeframeChange}>
                  <SelectTrigger id="timeframe">
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

              <Button onClick={createBot} disabled={!isConfigured || isTogglingService} className="w-full mt-4">
                {isTogglingService ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Bot...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Create & Start Bot
                  </>
                )}
              </Button>
            </div>

            {/* Right Column - Strategy Details */}
            <div className="space-y-2">
              {selectedStrategy ? (
                <div className="rounded-md border p-4 h-full">
                  <div className="font-medium mb-2 text-base">{selectedStrategy.name}</div>
                  <div className="text-muted-foreground text-xs mb-4 max-h-16 overflow-y-auto">{selectedStrategy.description}</div>

                  <div className="space-y-1 border-t pt-3 mt-2">
                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                      <span>Risk Parameters</span>
                      <span className="inline-block ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">Used by Bot</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Risk:</span>
                        <span className="font-medium">{(selectedStrategy.riskParameters?.maxRiskPercent ?? "N/A").toString()}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <span className="font-medium">{(selectedStrategy.riskParameters?.stopLossMultiplier ?? "N/A").toString()}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Take Profit:</span>
                        <span className="font-medium">{(selectedStrategy.riskParameters?.takeProfitMultiplier ?? "N/A").toString()}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timeframes:</span>
                        <span className="font-medium">{selectedStrategy.timeframes?.join(", ") || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-3">
                    <h4 className="text-sm font-semibold mb-2">Indicators Used</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedStrategy.rules?.indicators ? (
                        Object.keys(selectedStrategy.rules.indicators).map((indicator) => (
                          <span key={indicator} className="bg-secondary/60 text-xs rounded px-2 py-1">
                            {indicator}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No indicators specified</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full border rounded-md border-dashed p-8">
                  <div className="text-center text-muted-foreground">
                    <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a strategy to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Bots Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <span>Active Trading Bots</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingBots ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allBots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Timeframe</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Last Check</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>P/L</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allBots.map((bot) => (
                  <TableRow key={bot.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className={cn("h-3 w-3 rounded-full", {
                            "bg-green-500 animate-pulse": bot.isActive,
                            "bg-red-500": !bot.isActive,
                          })}
                        />
                        <span>{bot.isActive ? "Active" : "Inactive"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{bot.pair}</TableCell>
                    <TableCell>{bot.timeframe}</TableCell>
                    <TableCell>{strategies.find((s) => s.id === bot.strategyId)?.name || "Unknown"}</TableCell>
                    <TableCell>{bot.lastCheck ? formatDistanceToNow(new Date(bot.lastCheck), { addSuffix: true }) : "Never"}</TableCell>
                    <TableCell>{bot.dailyStats?.winRate?.toFixed(1) || 0}%</TableCell>
                    <TableCell className={cn({ "text-green-600": (bot.dailyStats?.profitLoss || 0) > 0, "text-red-600": (bot.dailyStats?.profitLoss || 0) < 0 })}>
                      {(bot.dailyStats?.profitLoss || 0).toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      <Button variant={bot.isActive ? "destructive" : "outline"} size="sm" onClick={() => toggleBot(bot.id!, bot.isActive)}>
                        {bot.isActive ? "Stop" : "Start"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-6 border rounded-lg bg-secondary/20">
              <Activity className="h-12 w-12 mx-auto mb-4 text-secondary-foreground/60" />
              <p className="text-secondary-foreground/70">No active trading bots found</p>
              <p className="text-xs text-muted-foreground mt-1">Configure and start a bot to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
