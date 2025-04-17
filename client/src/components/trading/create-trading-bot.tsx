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
import { AlertCircle, BrainCircuit, Loader2, RefreshCcw } from "lucide-react";
import { createIndicator } from "@/components/trading/chart/indicators/indicatorFactory";
import { useIndicatorStore } from "@/components/trading/chart/indicators/indicatorStore";
import { IndicatorParameters } from "@/components/trading/chart/core/ChartTypes";
import { Badge } from "@/components/ui/badge";
import { getCurrentUserId } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function CreateTradingBot() {
  const { aiTradingConfig, updateAITradingConfig, selectedBroker, selectedPair } = useTradingStore();
  const { addIndicator, clearAllIndicators } = useIndicatorStore();
  const aiTradingApi = useAITradingApi();
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Fetch strategies
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: async () => {
      const result = await aiTradingApi.getStrategies();
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
      if (!selectedBroker) {
        setError("Please select a broker connection");
        setIsCreating(false);
        return;
      }
      if (!selectedPair) {
        setError("Please select a trading pair");
        setIsCreating(false);
        return;
      }
      // Debug: Log all relevant bot creation data
      console.log('--- CLIENT BOT CREATION DEBUG START ---');
      console.log('userId:', userId);
      console.log('userId type:', typeof userId);
      console.log('strategy:', strategy);
      console.log('timeframe:', timeframe);
      console.log('selectedBroker:', selectedBroker);
      console.log('selectedPair:', selectedPair);
      console.log('aiTradingConfig:', aiTradingConfig);
      console.log('--- CLIENT BOT CREATION DEBUG END ---');
      const response = await fetch(`${API_URL}/trading/bot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && window.Clerk && window.Clerk.session && window.Clerk.session.getToken ? { Authorization: `Bearer ${await window.Clerk.session.getToken()}` } : {}),
        },
        body: JSON.stringify({
          pair: selectedPair.symbol,
          timeframe,
          strategyId: strategy,
          riskSettings: {
            maxRiskPerTrade: 2, // Default value
          },
          brokerCredentialId: selectedBroker.id,
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

      // Refresh bot list
      queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
    } catch (error: unknown) {
      console.error("Error creating bot:", error);
      setError(`Failed to create bot: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle bot status
  const toggleBot = async (botId: string, isActive: boolean) => {
    try {
      const userId = await getCurrentUserId();
      const action = isActive ? "stop" : "start";
      const response = await fetch(`${API_URL}/trading/bot/${botId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "dev-auth": "true",
          "x-user-id": userId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      // Refresh the bots list
      queryClient.invalidateQueries({ queryKey: ["all-trading-bots"] });
    } catch (error) {
      console.error(`Error ${isActive ? "stopping" : "starting"} bot:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isActive ? "stop" : "start"} bot`);
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
            <div className="grid grid-cols-1 gap-4">
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
    </div>
  );
}
