"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingStore } from "@/stores/trading-store";
import { useAITradingApi } from "@/lib/ai-trading-api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, Power, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select as TimeframeSelect } from "@/components/ui/select";
import { createIndicator } from "@/components/trading/chart/indicators/indicatorFactory";
import { useIndicatorStore } from "@/components/trading/chart/indicators/indicatorStore";
import { IndicatorParameters } from "@/components/trading/chart/core/ChartTypes";

// Update AITradingConfig type
declare module "@/stores/trading-store" {
  interface AITradingConfig {
    timeframe?: string;
  }
}

export function AITradingConfig() {
  const { aiTradingConfig, updateAITradingConfig, selectedBroker, selectedPair } = useTradingStore();
  const { addIndicator, clearAllIndicators } = useIndicatorStore();
  const aiTradingApi = useAITradingApi();
  const [isTogglingService, setIsTogglingService] = useState(false);
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

  // Fetch active bot status
  const { data: activeBotStatus } = useQuery({
    queryKey: ["trading-bot-status"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/trading-bots/status");
        if (!response.ok) throw new Error("Failed to fetch bot status");
        return await response.json();
      } catch (error) {
        console.error("Error fetching bot status:", error);
        return null;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Load strategy indicators
  const loadStrategyIndicators = useCallback(
    (strategyId: string | null) => {
      console.log("AITradingConfig: Loading indicators for strategy:", strategyId);
      // Clear existing indicators
      clearAllIndicators();
      console.log("AITradingConfig: Cleared all existing indicators");

      if (!strategyId) {
        console.log("AITradingConfig: No strategy ID provided, skipping indicator loading");
        return;
      }

      // Find the selected strategy
      const strategy = strategies.find((s) => s.id === strategyId);
      console.log("AITradingConfig: Found strategy:", strategy);

      if (!strategy) {
        console.log("AITradingConfig: Strategy not found, skipping indicator loading");
        return;
      }

      if (!strategy.rules?.indicators) {
        console.log("AITradingConfig: Strategy has no indicators defined, skipping indicator loading");
        return;
      }

      console.log("AITradingConfig: Strategy indicators:", strategy.rules.indicators);

      // Add each indicator from the strategy
      Object.entries(strategy.rules.indicators).forEach(([type, config]) => {
        try {
          console.log(`AITradingConfig: Creating indicator of type ${type} with config:`, config);

          // Convert the config to the correct format
          const params: IndicatorParameters =
            typeof config === "number" ? { period: config } : typeof config === "string" ? { period: parseInt(config, 10) } : (config as IndicatorParameters);
          console.log(`AITradingConfig: Converted parameters for ${type}:`, params);

          const indicator = createIndicator(type, params);
          if (indicator) {
            console.log(`AITradingConfig: Successfully created indicator of type ${type} with ID:`, indicator.getId());
            addIndicator(indicator);
            console.log(`AITradingConfig: Added indicator ${type} to the chart`);
          } else {
            console.error(`AITradingConfig: Failed to create indicator of type ${type}`);
          }
        } catch (error) {
          console.error(`AITradingConfig: Error creating indicator ${type}:`, error);
        }
      });

      console.log("AITradingConfig: Finished loading all indicators for strategy:", strategyId);

      // Force a chart update to ensure indicators are rendered
      setTimeout(() => {
        console.log("AITradingConfig: Forcing chart update to ensure indicators are rendered");
        if (selectedBroker && selectedPair) {
          console.log("AITradingConfig: Triggering manual chart refresh");
          const refreshEvent = new CustomEvent("forceChartRefresh", {
            detail: {
              pair: selectedPair,
              brokerId: selectedBroker.id,
              timeframe: aiTradingConfig.timeframe || "1h",
            },
          });
          window.dispatchEvent(refreshEvent);
        }
      }, 100);
    },
    [strategies, addIndicator, clearAllIndicators, selectedBroker, selectedPair, aiTradingConfig.timeframe]
  );

  // Toggle trading bot
  const toggleTradingBot = async () => {
    if (!selectedBroker || !selectedPair || !aiTradingConfig.selectedStrategyId) {
      toast.error("Please select a broker, trading pair, and strategy first");
      return;
    }

    setIsTogglingService(true);
    try {
      const response = await fetch("/api/trading-bots/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !activeBotStatus?.isRunning,
          strategyId: aiTradingConfig.selectedStrategyId,
          pair: selectedPair,
          brokerId: selectedBroker.id,
          timeframe: aiTradingConfig.timeframe || "1h",
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle bot service");

      toast.success(activeBotStatus?.isRunning ? "Trading bot stopped" : "Trading bot started");
      queryClient.invalidateQueries({ queryKey: ["trading-bot-status"] });
    } catch (error) {
      console.error("Error toggling bot service:", error);
      toast.error("Failed to toggle trading bot");
    } finally {
      setIsTogglingService(false);
    }
  };

  // Handle strategy selection with indicator loading
  const handleStrategyChange = (value: string) => {
    console.log("AITradingConfig: Strategy selected:", value);
    updateAITradingConfig({ selectedStrategyId: value || null });
    loadStrategyIndicators(value || null);
  };

  // Handle timeframe selection
  const handleTimeframeChange = (value: string) => {
    updateAITradingConfig({ timeframe: value });
  };

  const isConfigured = selectedBroker && selectedPair && aiTradingConfig.selectedStrategyId && aiTradingConfig.timeframe;
  const botStatus = activeBotStatus?.isRunning ? "active" : isTogglingService ? "toggling" : "inactive";

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            AI Trading
          </div>
          {activeBotStatus?.isRunning && (
            <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-500 border-green-500/20">
              Bot Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Configure and activate automated trading</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Strategy Selection */}
        <div className="space-y-2">
          <Label>Trading Strategy</Label>
          <Select
            value={aiTradingConfig.selectedStrategyId || ""}
            onValueChange={handleStrategyChange}
            disabled={isLoadingStrategies || botStatus === "active" || botStatus === "toggling"}>
            <SelectTrigger>
              <SelectValue placeholder="Select a strategy..." />
            </SelectTrigger>
            <SelectContent>
              {strategies.map((strategy) => (
                <SelectItem key={strategy.id} value={strategy.id}>
                  {strategy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timeframe Selection */}
        <div className="space-y-2">
          <Label>Trading Timeframe</Label>
          <TimeframeSelect value={aiTradingConfig.timeframe || ""} onValueChange={handleTimeframeChange} disabled={botStatus === "active" || botStatus === "toggling"}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="30m">30 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
            </SelectContent>
          </TimeframeSelect>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-2">
          <Label>Custom Instructions (Optional)</Label>
          <Input
            placeholder="Add custom instructions for the trading bot..."
            value={aiTradingConfig.customPrompt || ""}
            onChange={(e) => updateAITradingConfig({ customPrompt: e.target.value })}
            disabled={botStatus === "active" || botStatus === "toggling"}
          />
        </div>

        <Separator className="my-6" />

        {/* Bot Activation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automated Trading</Label>
              <div className="text-sm text-muted-foreground">
                {botStatus === "active" ? "Bot is actively trading" : botStatus === "toggling" ? "Updating bot status..." : "Start automated trading"}
              </div>
            </div>
            <Switch checked={botStatus === "active"} onCheckedChange={toggleTradingBot} disabled={!isConfigured || botStatus === "toggling"} />
          </div>

          {botStatus === "active" && (
            <Alert>
              <Power className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Trading bot is active and running in the background</span>
                <Button variant="link" className="h-auto p-0" onClick={() => (window.location.href = "/trading/bots")}>
                  View Details <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isConfigured && (
            <Alert variant="destructive">
              <AlertDescription>Please select a broker, trading pair, strategy, and timeframe to activate automated trading.</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
