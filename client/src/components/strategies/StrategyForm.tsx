import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, HelpCircle, Clock, ArrowRightLeft, TrendingUp, Zap, BarChart3, Settings, Trash2 } from "lucide-react";
import { Strategy, StrategyRules } from "@/services/strategy";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserStore } from "@/stores/user-store";

// Common timeframes for trading
const timeframeOptions = [
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "30m", label: "30 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "1w", label: "1 Week" },
];

// Strategy types
const strategyTypes = [
  { value: "trend-following", label: "Trend Following", icon: TrendingUp },
  { value: "mean-reversion", label: "Mean Reversion", icon: ArrowRightLeft },
  { value: "breakout", label: "Breakout", icon: Zap },
];

// Market conditions
const marketConditions = [
  { value: "bullish", label: "Bullish" },
  { value: "bearish", label: "Bearish" },
  { value: "sideways", label: "Sideways" },
  { value: "volatile", label: "Volatile" },
  { value: "low_volatility", label: "Low Volatility" },
];

// Common entry/exit rule conditions - will be used in future enhancements
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const conditionOptions = {
  entry: [
    { value: "price_above_ma", label: "Price Above Moving Average" },
    { value: "price_below_ma", label: "Price Below Moving Average" },
    { value: "ma_crossover", label: "Moving Average Crossover" },
    { value: "rsi_overbought", label: "RSI Overbought" },
    { value: "rsi_oversold", label: "RSI Oversold" },
  ],
  exit: [
    { value: "take_profit", label: "Take Profit" },
    { value: "stop_loss", label: "Stop Loss" },
    { value: "trailing_stop", label: "Trailing Stop" },
  ],
};

// Indicator options
const indicatorOptions = [
  { value: "rsi", label: "RSI (Relative Strength Index)", configKey: "period", defaultValue: 14, min: 2, max: 50 },
  { value: "adx", label: "ADX (Average Directional Index)", configKey: "period", defaultValue: 14, min: 3, max: 50 },
  { value: "moving_average", label: "Moving Average", configKey: "period", defaultValue: 20, min: 5, max: 200 },
];

interface StrategyFormProps {
  initialData?: Partial<Strategy>;
  onSubmit: (formData: {
    name: string;
    description: string;
    timeframes: string[];
    isActive: boolean;
    rules?: StrategyRules;
    riskParameters?: Record<string, unknown>;
  }) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  isEditMode?: boolean;
}

// Field info tooltip component
function FieldInfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <HelpCircle className="h-4 w-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-help ml-1.5" />
      </TooltipTrigger>
      <TooltipContent sideOffset={5} side="right" align="start" className="max-w-xs p-3 z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md">
        <p className="text-sm text-slate-800 dark:text-slate-200">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function StrategyForm({ initialData, onSubmit, isSubmitting, submitLabel, isEditMode = false }: StrategyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || "");
  const [strategyDescription, setStrategyDescription] = useState(initialData?.description || "");
  const [selectedTimeframes, setSelectedTimeframes] = useState<string[]>(initialData?.timeframes || ["1h"]);
  const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);
  const [strategyType, setStrategyType] = useState(initialData?.rules?.type || "trend-following");
  const [selectedMarketConditions, setSelectedMarketConditions] = useState<string[]>(initialData?.rules?.market_conditions || ["bullish"]);

  // Indicators state management
  const [selectedIndicators, setSelectedIndicators] = useState<
    Array<{
      type: string;
      config: Record<string, number>;
    }>
  >(
    initialData?.rules?.indicators
      ? Object.entries(initialData.rules.indicators).map(([key, value]) => ({
          type: key,
          config: typeof value === "number" ? { period: value } : (value as unknown as Record<string, number>),
        }))
      : [{ type: "moving_average", config: { period: 20 } }]
  );

  // Get user subscription from the store
  const userSubscription = useUserStore((state: { credits: { subscription: string } }) => state.credits.subscription);
  const maxIndicators = userSubscription === "pro" ? 8 : 3;

  // Risk parameters with updated structure
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState<number>(initialData?.riskParameters?.maxRiskPerTrade ? Number(initialData.riskParameters.maxRiskPerTrade) : 1);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(initialData?.riskParameters?.riskRewardRatio ? Number(initialData.riskParameters.riskRewardRatio) : 2);
  const [trailingStopEnabled, setTrailingStopEnabled] = useState<boolean>(
    initialData?.riskParameters?.trailingStopEnabled ? Boolean(initialData.riskParameters.trailingStopEnabled) : false
  );
  const [trailingStopPercentage, setTrailingStopPercentage] = useState<number>(
    initialData?.riskParameters?.trailingStopPercentage ? Number(initialData.riskParameters.trailingStopPercentage) : 1
  );

  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    description?: string;
    timeframes?: string;
  }>({});

  // Only update form state on initial load and when initialData.id changes
  // This prevents field resets during typing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setStrategyDescription(initialData.description || "");
      setSelectedTimeframes(initialData.timeframes || ["1h"]);
      setIsActive(initialData.isActive !== undefined ? initialData.isActive : true);

      // Rules
      if (initialData.rules) {
        setStrategyType(initialData.rules.type || "trend-following");
        setSelectedMarketConditions(initialData.rules.market_conditions || ["bullish"]);

        // Indicators
        if (initialData.rules.indicators) {
          setSelectedIndicators(
            Object.entries(initialData.rules.indicators).map(([key, value]) => ({
              type: key,
              config: typeof value === "number" ? { period: value } : (value as unknown as Record<string, number>),
            }))
          );
        }
      }

      // Risk parameters
      if (initialData.riskParameters) {
        setMaxRiskPerTrade(Number(initialData.riskParameters.maxRiskPerTrade) || 1);
        setRiskRewardRatio(Number(initialData.riskParameters.riskRewardRatio) || 2);
        setTrailingStopEnabled(Boolean(initialData.riskParameters.trailingStopEnabled) || false);
        setTrailingStopPercentage(Number(initialData.riskParameters.trailingStopPercentage) || 1);
      }
    }
  }, [initialData?.id]); // Only depend on the ID changing, not the entire initialData object

  // Handle timeframe selection
  const toggleTimeframe = (timeframe: string) => {
    if (selectedTimeframes.includes(timeframe)) {
      setSelectedTimeframes(selectedTimeframes.filter((t) => t !== timeframe));
    } else {
      setSelectedTimeframes([...selectedTimeframes, timeframe]);
    }
  };

  // Handle market condition selection
  const toggleMarketCondition = (condition: string) => {
    if (selectedMarketConditions.includes(condition)) {
      setSelectedMarketConditions(selectedMarketConditions.filter((c) => c !== condition));
    } else {
      setSelectedMarketConditions([...selectedMarketConditions, condition]);
    }
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      description?: string;
      timeframes?: string;
    } = {};

    if (!name.trim()) {
      errors.name = "Strategy name is required";
    }

    if (!strategyDescription.trim()) {
      errors.description = "Strategy description is required";
    } else if (strategyDescription.length < 20) {
      errors.description = "Please provide a more detailed description (at least 20 characters)";
    }

    if (selectedTimeframes.length === 0) {
      errors.timeframes = "Please select at least one timeframe";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Indicator management functions
  const addIndicator = () => {
    if (selectedIndicators.length >= maxIndicators) {
      toast({
        title: "Indicator Limit Reached",
        description:
          userSubscription === "pro"
            ? "You've reached the maximum of 8 indicators for Pro users."
            : "Free users can add up to 3 indicators. Upgrade to Pro for up to 8 indicators.",
        variant: "destructive",
      });
      return;
    }

    // Find first indicator not already selected
    const availableIndicator = indicatorOptions.find((opt) => !selectedIndicators.some((sel) => sel.type === opt.value));

    if (availableIndicator) {
      setSelectedIndicators([
        ...selectedIndicators,
        {
          type: availableIndicator.value,
          config: { [availableIndicator.configKey]: availableIndicator.defaultValue },
        },
      ]);
    } else {
      toast({
        title: "All indicators already added",
        description: "You've already added all available indicators.",
      });
    }
  };

  const removeIndicator = (index: number) => {
    setSelectedIndicators(selectedIndicators.filter((_, i) => i !== index));
  };

  const updateIndicatorType = (index: number, newType: string) => {
    const indicatorOption = indicatorOptions.find((opt) => opt.value === newType);

    if (!indicatorOption) return;

    setSelectedIndicators(
      selectedIndicators.map((ind, i) => {
        if (i === index) {
          return {
            type: newType,
            config: { [indicatorOption.configKey]: indicatorOption.defaultValue },
          };
        }
        return ind;
      })
    );
  };

  const updateIndicatorConfig = (index: number, configKey: string, value: number) => {
    setSelectedIndicators(
      selectedIndicators.map((ind, i) => {
        if (i === index) {
          return {
            ...ind,
            config: { ...ind.config, [configKey]: value },
          };
        }
        return ind;
      })
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    // Convert selected indicators to the format expected by the API
    const indicatorsObj: Record<string, unknown> = {};
    selectedIndicators.forEach((indicator) => {
      indicatorsObj[indicator.type] = indicator.config;
    });

    // Prepare rules object
    const rules: StrategyRules = {
      entry: {
        conditions: [
          {
            condition: "price_above_ma",
            parameters: { period: selectedIndicators.find((i) => i.type === "moving_average")?.config?.period || 20 },
          },
        ],
        operator: "AND",
      },
      exit: {
        conditions: [
          {
            condition: "take_profit",
            parameters: { rrr: riskRewardRatio },
          },
          {
            condition: "stop_loss",
            parameters: { percentage: maxRiskPerTrade },
          },
        ],
        operator: "AND",
      },
      indicators: indicatorsObj as Record<string, string | number>,
      type: strategyType,
      market_conditions: selectedMarketConditions,
    };

    // Prepare risk parameters
    const riskParameters = {
      maxRiskPerTrade,
      riskRewardRatio,
      trailingStopEnabled,
      trailingStopPercentage,
    };

    try {
      await onSubmit({
        name,
        description: strategyDescription,
        timeframes: selectedTimeframes,
        isActive,
        rules,
        riskParameters,
      });
    } catch (error) {
      // This will catch any errors that weren't caught in the parent component
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? "update" : "create"} strategy: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="rules">Strategy Rules</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Basic Information */}
              <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                      <Lightbulb className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Basic Information</CardTitle>
                      <CardDescription>{isEditMode ? "Update your strategy name and description" : "Define your strategy name and description"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="name">Strategy Name</Label>
                      <FieldInfoTooltip content="Give your strategy a clear, descriptive name that helps you identify its purpose. For example: 'EMA Crossover Strategy' or 'RSI Divergence Trader'." />
                    </div>
                    <Input
                      id="name"
                      placeholder="e.g., Moving Average Crossover"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className={validationErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {validationErrors.name && <p className="text-sm text-red-500">{validationErrors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="description">Description</Label>
                      <FieldInfoTooltip content="Describe your strategy in detail, including the entry and exit conditions, risk management rules, and any specific market conditions it works best in. The more detailed, the better." />
                    </div>
                    <Textarea
                      id="description"
                      placeholder="Describe how your strategy works including entry and exit rules..."
                      value={strategyDescription}
                      onChange={(e) => setStrategyDescription(e.target.value)}
                      rows={6}
                      required
                      className={validationErrors.description ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {validationErrors.description && <p className="text-sm text-red-500">{validationErrors.description}</p>}
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                    <Label htmlFor="active" className="cursor-pointer">
                      Strategy Active
                    </Label>
                    <FieldInfoTooltip content="Active strategies can be used in trading bots. Inactive strategies are saved but won't be available for trading." />
                  </div>
                </CardContent>
              </Card>

              {/* Timeframes and Strategy Type */}
              <div className="space-y-6">
                <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                        <Clock className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle>Timeframes</CardTitle>
                        <CardDescription>Select timeframes this strategy will operate on</CardDescription>
                      </div>
                      <FieldInfoTooltip content="Choose the chart timeframes your strategy is designed for. You can select multiple timeframes if your strategy works across different time intervals." />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {timeframeOptions.map((timeframe) => (
                        <div
                          key={timeframe.value}
                          className={`
                            p-3 border rounded-lg flex items-center justify-between cursor-pointer
                            ${
                              selectedTimeframes.includes(timeframe.value)
                                ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/50"
                                : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/80"
                            }
                            ${validationErrors.timeframes ? "border-red-500" : ""}
                          `}
                          onClick={() => toggleTimeframe(timeframe.value)}>
                          <span className={selectedTimeframes.includes(timeframe.value) ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"}>
                            {timeframe.label}
                          </span>
                          {selectedTimeframes.includes(timeframe.value) && <div className="h-2 w-2 bg-blue-500 dark:bg-blue-400 rounded-full"></div>}
                        </div>
                      ))}
                    </div>
                    {validationErrors.timeframes && <p className="text-sm text-red-500 mt-2">{validationErrors.timeframes}</p>}
                  </CardContent>
                </Card>

                <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center">
                      <div className="p-2 bg-green-500/10 dark:bg-green-400/10 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-green-500 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle>Strategy Type & Market Conditions</CardTitle>
                        <CardDescription>Select the type of strategy and preferred market conditions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="strategy-type">Strategy Type</Label>
                      <Select value={strategyType} onValueChange={setStrategyType}>
                        <SelectTrigger id="strategy-type">
                          <SelectValue placeholder="Select strategy type" />
                        </SelectTrigger>
                        <SelectContent>
                          {strategyTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Market Conditions</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {marketConditions.map((condition) => (
                          <Badge
                            key={condition.value}
                            className={`cursor-pointer ${
                              selectedMarketConditions.includes(condition.value)
                                ? "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            }`}
                            onClick={() => toggleMarketCondition(condition.value)}>
                            {condition.label}
                            {selectedMarketConditions.includes(condition.value) && <span className="ml-1 text-xs">✓</span>}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Strategy Rules Tab */}
          <TabsContent value="rules">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                      <BarChart3 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Indicators</CardTitle>
                      <CardDescription>Configure technical indicators for your strategy</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>
                      Active Indicators ({selectedIndicators.length}/{maxIndicators})
                    </Label>
                    <Button type="button" size="sm" variant="outline" onClick={addIndicator} disabled={selectedIndicators.length >= maxIndicators}>
                      Add Indicator
                    </Button>
                  </div>

                  {userSubscription === "free" && selectedIndicators.length >= maxIndicators && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-sm text-blue-600 dark:text-blue-300 flex items-center">
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Upgrade to Pro for up to 8 indicators
                    </div>
                  )}

                  {selectedIndicators.map((indicator, index) => {
                    const indicatorInfo = indicatorOptions.find((opt) => opt.value === indicator.type);
                    if (!indicatorInfo) return null;

                    return (
                      <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <Select value={indicator.type} onValueChange={(value) => updateIndicatorType(index, value)}>
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Select indicator" />
                            </SelectTrigger>
                            <SelectContent>
                              {indicatorOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value} disabled={selectedIndicators.some((ind) => ind.type === option.value && ind !== indicator)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => removeIndicator(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label htmlFor={`indicator-${index}-period`}>Period</Label>
                            <FieldInfoTooltip content="The number of candles used to calculate this indicator." />
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              id={`indicator-${index}-period`}
                              type="number"
                              min={indicatorInfo.min}
                              max={indicatorInfo.max}
                              value={indicator.config.period || indicatorInfo.defaultValue}
                              onChange={(e) => updateIndicatorConfig(index, "period", parseInt(e.target.value))}
                            />
                            <span className="text-sm text-slate-500 dark:text-slate-400">periods</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                      <Settings className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Risk Management</CardTitle>
                      <CardDescription>Configure risk parameters for your strategy</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Risk Management Parameters */}
                  <div className="space-y-4">
                    {/* Max Risk Per Trade */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Label htmlFor="max-risk">Max Risk Per Trade</Label>
                        <FieldInfoTooltip content="The maximum percentage of your account that can be risked on a single trade. This determines position size and stop loss." />
                      </div>
                      <div className="flex items-center gap-3">
                        <Input id="max-risk" type="number" min="0.1" max="10" step="0.1" value={maxRiskPerTrade} onChange={(e) => setMaxRiskPerTrade(parseFloat(e.target.value))} />
                        <span className="text-sm text-slate-500 dark:text-slate-400">% of account</span>
                      </div>
                    </div>

                    {/* Risk-Reward Ratio */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Label htmlFor="risk-reward">Risk-Reward Ratio</Label>
                        <FieldInfoTooltip content="The ratio of potential reward to risk. A value of 2 means your profit target will be 2x your risk amount." />
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          id="risk-reward"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={riskRewardRatio}
                          onChange={(e) => setRiskRewardRatio(parseFloat(e.target.value))}
                        />
                        <span className="text-sm text-slate-500 dark:text-slate-400">R:R ratio</span>
                      </div>
                    </div>

                    {/* Trailing Stop */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Label htmlFor="trailing-stop">Trailing Stop</Label>
                          <FieldInfoTooltip content="Trailing stop follows the price as it moves in your favor, helping to lock in profits while letting winners run." />
                        </div>
                        <Switch id="trailing-stop" checked={trailingStopEnabled} onCheckedChange={setTrailingStopEnabled} />
                      </div>

                      {trailingStopEnabled && (
                        <div className="flex items-center gap-3 mt-3">
                          <Input
                            id="trailing-stop-percentage"
                            type="number"
                            min="0.5"
                            max="10"
                            step="0.1"
                            value={trailingStopPercentage}
                            onChange={(e) => setTrailingStopPercentage(parseFloat(e.target.value))}
                          />
                          <span className="text-sm text-slate-500 dark:text-slate-400">% trailing distance</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()} className="mr-2">
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                {isEditMode ? "Updating..." : "Creating..."}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
