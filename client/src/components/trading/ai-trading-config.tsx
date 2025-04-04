"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingStore } from "@/stores/trading-store";
import { useAITradingApi } from "@/lib/ai-trading-api";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Settings, BrainCircuit, Activity } from "lucide-react";
import { createIndicator } from "@/components/trading/chart/indicators/indicatorFactory";
import { useIndicatorStore } from "@/components/trading/chart/indicators/indicatorStore";
import { IndicatorParameters } from "@/components/trading/chart/core/ChartTypes";

export function AITradingConfig() {
  const { aiTradingConfig, updateAITradingConfig, selectedBroker, selectedPair } = useTradingStore();
  const { addIndicator, clearAllIndicators } = useIndicatorStore();
  const aiTradingApi = useAITradingApi();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
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

  // Function to refresh strategies
  const refreshStrategies = useCallback(() => {
    console.log("AITradingConfig: Refreshing strategies cache");
    queryClient.invalidateQueries({ queryKey: ["strategies"] });
  }, [queryClient]);

  // Load strategy indicators when a strategy is selected
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
      // This is a workaround for the issue where indicators don't render properly until timeframe is changed
      setTimeout(() => {
        console.log("AITradingConfig: Forcing chart update to ensure indicators are rendered");
        // Trigger a manual refresh of the chart data
        if (selectedBroker && selectedPair) {
          console.log("AITradingConfig: Triggering manual chart refresh");
          // We'll use a custom event to trigger a refresh in the TradingChart component
          const refreshEvent = new CustomEvent("forceChartRefresh", {
            detail: {
              pair: selectedPair,
              brokerId: selectedBroker.id,
              timeframe: "1h",
            },
          });
          window.dispatchEvent(refreshEvent);
        }
      }, 100);
    },
    [strategies, addIndicator, clearAllIndicators, selectedBroker, selectedPair]
  );

  // Handle strategy selection
  const handleStrategyChange = (value: string) => {
    console.log("AITradingConfig: Strategy selected:", value);
    updateAITradingConfig({ selectedStrategyId: value || null });
    loadStrategyIndicators(value || null);
  };

  // Run analysis function
  const runAnalysis = useCallback(async () => {
    if (!selectedBroker || !selectedPair) {
      toast.error("Please select a broker and trading pair first");
      return;
    }

    setIsAnalyzing(true);
    try {
      console.log("AITradingConfig: Running analysis with config:", aiTradingConfig);
      const response = await aiTradingApi.analyzeChart({
        pair: selectedPair,
        timeframe: "1h", // Default timeframe
        credentialId: selectedBroker.id,
        strategyId: aiTradingConfig.selectedStrategyId || undefined,
        customPrompt: aiTradingConfig.customPrompt || undefined,
      });
      console.log("AITradingConfig: Analysis response:", response);

      // If a new strategy was created, refresh the strategies list
      if (response.strategy && !strategies.find((s) => s.id === response.strategy)) {
        console.log("AITradingConfig: New strategy created, refreshing strategies list");
        refreshStrategies();
      }

      // Convert indicator configuration
      const indicators = response.analysis.strategyRulesMet
        ? [
            {
              type: "RSI",
              parameters: {
                period: 14,
                overbought: 70,
                oversold: 30,
              },
            },
          ]
        : [];

      // Clear existing indicators
      clearAllIndicators();

      // Add new indicators
      for (const indicator of indicators) {
        try {
          console.log("AITradingConfig: Creating indicator:", indicator);
          const newIndicator = createIndicator(indicator.type, indicator.parameters);
          if (newIndicator) {
            console.log("AITradingConfig: Adding indicator to chart:", newIndicator);
            addIndicator(newIndicator);
          }
        } catch (error) {
          console.error("AITradingConfig: Error creating indicator:", error);
        }
      }

      toast.success(`Analysis complete: ${response.signal} signal with ${response.confidence}% confidence`);
    } catch (error) {
      console.error("AITradingConfig: Error running analysis:", error);
      toast.error("Failed to run analysis");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedBroker, selectedPair, aiTradingConfig, aiTradingApi, clearAllIndicators, addIndicator, strategies, refreshStrategies]);

  // Set up scheduled analysis if enabled
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (aiTradingConfig.scheduledAnalysis && !aiTradingConfig.backgroundService) {
      interval = setInterval(() => {
        runAnalysis();
      }, aiTradingConfig.analysisInterval * 60 * 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [aiTradingConfig.scheduledAnalysis, aiTradingConfig.backgroundService, aiTradingConfig.analysisInterval, selectedBroker, selectedPair]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5" />
          AI Trading
        </CardTitle>
        <CardDescription>Configure AI-powered trading analysis and execution</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="analysis">
              <Activity className="w-4 h-4 mr-2" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-4">
            {/* Strategy Selection */}
            <div className="space-y-2">
              <Label htmlFor="strategy">Trading Strategy</Label>
              <Select value={aiTradingConfig.selectedStrategyId || ""} onValueChange={handleStrategyChange} disabled={isLoadingStrategies}>
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="Select a strategy" />
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

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Custom Instructions (Optional)</Label>
              <Input
                id="prompt"
                placeholder="Add custom instructions for AI analysis"
                value={aiTradingConfig.customPrompt}
                onChange={(e) => updateAITradingConfig({ customPrompt: e.target.value })}
              />
            </div>

            {/* Execution Mode */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="execution-mode" className="block">
                  Execution Mode
                </Label>
                <p className="text-sm text-muted-foreground">{aiTradingConfig.analysisOnly ? "Analysis only" : "Analysis + Trade Execution"}</p>
              </div>
              <Switch id="execution-mode" checked={!aiTradingConfig.analysisOnly} onCheckedChange={(checked) => updateAITradingConfig({ analysisOnly: !checked })} />
            </div>

            {/* Action Buttons */}
            <div className="pt-4">
              <Button onClick={runAnalysis} disabled={isAnalyzing || !selectedBroker || !selectedPair} className="w-full">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            {/* Scheduled Analysis */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="scheduled" className="block">
                  Scheduled Analysis
                </Label>
                <p className="text-sm text-muted-foreground">Run analysis automatically on schedule</p>
              </div>
              <Switch id="scheduled" checked={aiTradingConfig.scheduledAnalysis} onCheckedChange={(checked) => updateAITradingConfig({ scheduledAnalysis: checked })} />
            </div>

            {aiTradingConfig.scheduledAnalysis && (
              <>
                {/* Analysis Interval */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="interval">Analysis Interval (minutes)</Label>
                    <span className="text-sm text-muted-foreground">{aiTradingConfig.analysisInterval} min</span>
                  </div>
                  <Slider
                    id="interval"
                    min={5}
                    max={240}
                    step={5}
                    value={[aiTradingConfig.analysisInterval]}
                    onValueChange={(values) => updateAITradingConfig({ analysisInterval: values[0] })}
                  />
                </div>

                {/* Background Service */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="background" className="block">
                      Background Service
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {aiTradingConfig.backgroundService ? "Run on server (even when browser is closed)" : "Run in browser (stops when page is closed)"}
                    </p>
                  </div>
                  <Switch id="background" checked={aiTradingConfig.backgroundService} onCheckedChange={(checked) => updateAITradingConfig({ backgroundService: checked })} />
                </div>
              </>
            )}

            {!aiTradingConfig.analysisOnly && (
              <>
                {/* Risk Percentage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="risk">Risk per Trade (%)</Label>
                    <span className="text-sm text-muted-foreground">{aiTradingConfig.riskPercentage}%</span>
                  </div>
                  <Slider
                    id="risk"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={[aiTradingConfig.riskPercentage]}
                    onValueChange={(values) => updateAITradingConfig({ riskPercentage: values[0] })}
                  />
                </div>

                {/* Max Open Positions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="positions">Max Open Positions</Label>
                    <span className="text-sm text-muted-foreground">{aiTradingConfig.maxOpenPositions}</span>
                  </div>
                  <Slider
                    id="positions"
                    min={1}
                    max={10}
                    step={1}
                    value={[aiTradingConfig.maxOpenPositions]}
                    onValueChange={(values) => updateAITradingConfig({ maxOpenPositions: values[0] })}
                  />
                </div>

                {/* Confirmation Required */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="confirmation" className="block">
                      Require Confirmation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {aiTradingConfig.confirmationRequired ? "Manual confirmation required before execution" : "Execute trades automatically without confirmation"}
                    </p>
                  </div>
                  <Switch
                    id="confirmation"
                    checked={aiTradingConfig.confirmationRequired}
                    onCheckedChange={(checked) => updateAITradingConfig({ confirmationRequired: checked })}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
