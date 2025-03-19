"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTradingStore } from "@/stores/trading-store";
import { useAITradingApi, Strategy } from "@/lib/ai-trading-api";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Settings, BrainCircuit, Activity } from "lucide-react";

export function AITradingConfig() {
  const { aiTradingConfig, updateAITradingConfig, selectedBroker, selectedPair } = useTradingStore();

  const aiTradingApi = useAITradingApi();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");

  // Fetch strategies
  const { data: strategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: aiTradingApi.getStrategies,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Run analysis function
  const runAnalysis = async () => {
    if (!selectedBroker || !selectedPair) {
      toast.error("Please select a broker and trading pair first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await aiTradingApi.analyzeChart({
        pair: selectedPair,
        timeframe: "1h", // Default timeframe
        credentialId: selectedBroker.id,
        strategyId: aiTradingConfig.selectedStrategyId || undefined,
        customPrompt: aiTradingConfig.customPrompt || undefined,
      });

      toast.success(`Analysis complete: ${response.signalType} signal with ${response.confidence}% confidence`);

      // If confidence > 70% and execution mode is enabled, confirm and execute
      if (response.confidence > 70 && !aiTradingConfig.analysisOnly) {
        const confirmation = await aiTradingApi.confirmSignal({
          signalId: response.id,
          higherTimeframe: "4h", // Higher timeframe for confirmation
        });

        if (confirmation.confirmed && confirmation.confidence > 70) {
          if (aiTradingConfig.confirmationRequired) {
            // Show confirmation dialog
            toast.info("Trade signal confirmed. Manual execution required.");
          } else {
            // Auto-execute
            const trade = await aiTradingApi.executeTrade({
              signalId: response.id,
              credentialId: selectedBroker.id,
              riskPercent: aiTradingConfig.riskPercentage,
            });
            toast.success(`Trade executed: ${trade.side} ${trade.quantity} ${selectedPair} at ${trade.entryPrice}`);
          }
        } else {
          toast.info("Signal not confirmed on higher timeframe. No trade executed.");
        }
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to complete analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
              <Select
                value={aiTradingConfig.selectedStrategyId || ""}
                onValueChange={(value) => updateAITradingConfig({ selectedStrategyId: value || null })}
                disabled={isLoadingStrategies}>
                <SelectTrigger id="strategy">
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingStrategies ? (
                    <SelectItem value="loading" disabled>
                      Loading strategies...
                    </SelectItem>
                  ) : strategies.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No strategies available
                    </SelectItem>
                  ) : (
                    strategies.map((strategy: Strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))
                  )}
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
