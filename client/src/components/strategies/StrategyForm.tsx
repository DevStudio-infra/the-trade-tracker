import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, HelpCircle, BarChart3, Settings, Trash2, Loader2 } from "lucide-react";
import { Strategy, StrategyRules } from "@/services/strategy";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserStore } from "@/stores/user-store";

// Indicator options
interface IndicatorParameter {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  kPeriod?: number;
  dPeriod?: number;
  conversionPeriod?: number;
  basePeriod?: number;
  spanPeriod?: number;
  displacement?: number;
  [key: string]: number | undefined; // Allow indexing with string
}

interface IndicatorOption {
  value: string;
  label: string;
  configKey: string;
  defaultValue: number | IndicatorParameter;
  min: number | IndicatorParameter;
  max: number | IndicatorParameter;
  isOscillator: boolean;
}

const indicatorOptions: IndicatorOption[] = [
  {
    value: "SMA",
    label: "Simple Moving Average (SMA)",
    configKey: "period",
    defaultValue: 20,
    min: 5,
    max: 200,
    isOscillator: false,
  },
  {
    value: "EMA",
    label: "Exponential Moving Average (EMA)",
    configKey: "period",
    defaultValue: 20,
    min: 5,
    max: 200,
    isOscillator: false,
  },
  {
    value: "RSI",
    label: "Relative Strength Index (RSI)",
    configKey: "period",
    defaultValue: 14,
    min: 2,
    max: 50,
    isOscillator: true,
  },
  {
    value: "MACD",
    label: "Moving Average Convergence Divergence (MACD)",
    configKey: "period",
    defaultValue: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    min: { fastPeriod: 2, slowPeriod: 5, signalPeriod: 2 },
    max: { fastPeriod: 50, slowPeriod: 100, signalPeriod: 50 },
    isOscillator: true,
  },
  {
    value: "BollingerBands",
    label: "Bollinger Bands",
    configKey: "period",
    defaultValue: { period: 20, stdDev: 2 },
    min: { period: 5, stdDev: 1 },
    max: { period: 100, stdDev: 5 },
    isOscillator: false,
  },
  {
    value: "ATR",
    label: "Average True Range (ATR)",
    configKey: "period",
    defaultValue: 14,
    min: 1,
    max: 50,
    isOscillator: true,
  },
  {
    value: "Stochastic",
    label: "Stochastic Oscillator",
    configKey: "period",
    defaultValue: { kPeriod: 14, dPeriod: 3 },
    min: { kPeriod: 1, dPeriod: 1 },
    max: { kPeriod: 50, dPeriod: 50 },
    isOscillator: true,
  },
  {
    value: "Ichimoku",
    label: "Ichimoku Cloud",
    configKey: "period",
    defaultValue: {
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26,
    },
    min: {
      conversionPeriod: 5,
      basePeriod: 10,
      spanPeriod: 20,
      displacement: 10,
    },
    max: {
      conversionPeriod: 30,
      basePeriod: 60,
      spanPeriod: 120,
      displacement: 60,
    },
    isOscillator: false,
  },
];

interface IndicatorConfig {
  type: string;
  config: IndicatorParameter;
}

interface StrategyFormProps {
  initialData?: Partial<Strategy>;
  onSubmit: (formData: {
    name: string;
    description: string;
    timeframes: string[];
    isActive: boolean;
    isPublic: boolean;
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

  // Hidden fields with default values
  const selectedTimeframes = ["1h", "4h", "1d"];
  const isActive = true;
  const isPublic = true;
  const strategyType = "trend-following";
  const selectedMarketConditions = ["bullish", "bearish"];

  // Indicators state management
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig[]>(
    initialData?.rules?.indicators
      ? Object.entries(initialData.rules.indicators).map(([key, value]) => ({
          type: key,
          config: typeof value === "number" ? { period: value } : (value as unknown as IndicatorParameter),
        }))
      : [{ type: "SMA", config: { period: 20 } }]
  );

  // Get user subscription from the store
  const userSubscription = useUserStore((state: { credits: { subscription: string } }) => state.credits.subscription);
  const maxIndicators = userSubscription === "pro" ? 8 : 3;

  // Risk parameters with updated structure for bot requirements
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState<number>(initialData?.riskParameters?.maxRiskPerTrade ? Number(initialData.riskParameters.maxRiskPerTrade) : 1);

  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  // Only update form state on initial load and when initialData.id changes
  // This prevents field resets during typing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setStrategyDescription(initialData.description || "");

      // Rules
      if (initialData.rules) {
        // Indicators
        if (initialData.rules.indicators) {
          setSelectedIndicators(
            Object.entries(initialData.rules.indicators).map(([key, value]) => ({
              type: key,
              config: typeof value === "number" ? { period: value } : (value as unknown as IndicatorParameter),
            }))
          );
        }
      }

      // Risk parameters
      if (initialData.riskParameters) {
        setMaxRiskPerTrade(Number(initialData.riskParameters.maxRiskPerTrade) || 1);
      }
    }
  }, [initialData?.id]); // Only depend on the ID changing, not the entire initialData object

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      description?: string;
    } = {};

    if (!name.trim()) {
      errors.name = "Strategy name is required";
    }

    if (!strategyDescription.trim()) {
      errors.description = "Strategy description is required";
    } else if (strategyDescription.length < 20) {
      errors.description = "Please provide a more detailed description (at least 20 characters)";
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

    // Count oscillators
    const currentOscillators = selectedIndicators.filter((ind) => indicatorOptions.find((opt) => opt.value === ind.type)?.isOscillator).length;

    // Find first indicator not already selected
    const availableIndicator = indicatorOptions.find((opt) => {
      const notSelected = !selectedIndicators.some((sel) => sel.type === opt.value);
      const isOscillator = opt.isOscillator;
      // Only allow one oscillator
      if (isOscillator && currentOscillators >= 1) {
        return false;
      }
      return notSelected;
    });

    if (availableIndicator) {
      // For complex parameters (objects), use the defaultValue directly
      const config =
        typeof availableIndicator.defaultValue === "object"
          ? (availableIndicator.defaultValue as IndicatorParameter)
          : { [availableIndicator.configKey]: availableIndicator.defaultValue };

      setSelectedIndicators([
        ...selectedIndicators,
        {
          type: availableIndicator.value,
          config,
        },
      ]);
    } else {
      toast({
        title: "Cannot Add Indicator",
        description: currentOscillators >= 1 ? "Only one oscillator indicator is allowed per strategy." : "You've already added all available indicators.",
      });
    }
  };

  const removeIndicator = (index: number) => {
    setSelectedIndicators(selectedIndicators.filter((_, i) => i !== index));
  };

  const updateIndicatorType = (index: number, newType: string) => {
    const indicatorInfo = indicatorOptions.find((opt) => opt.value === newType);
    if (!indicatorInfo) return;

    // Check if new type is an oscillator
    const isNewOscillator = indicatorInfo.isOscillator;
    const currentOscillators = selectedIndicators.filter((ind, i) => i !== index && indicatorOptions.find((opt) => opt.value === ind.type)?.isOscillator).length;

    if (isNewOscillator && currentOscillators >= 1) {
      toast({
        title: "Cannot Change Indicator",
        description: "Only one oscillator indicator is allowed per strategy.",
        variant: "destructive",
      });
      return;
    }

    // For complex parameters (objects), use the defaultValue directly
    const config = typeof indicatorInfo.defaultValue === "object" ? (indicatorInfo.defaultValue as IndicatorParameter) : { [indicatorInfo.configKey]: indicatorInfo.defaultValue };

    setSelectedIndicators(
      selectedIndicators.map((ind, i) => {
        if (i === index) {
          return {
            type: newType,
            config,
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
            parameters: { percentage: 2 },
          },
          {
            condition: "stop_loss",
            parameters: { percentage: 1 },
          },
        ],
        operator: "AND",
      },
      indicators: indicatorsObj as Record<string, string | number | IndicatorParameter>,
      type: strategyType,
      market_conditions: selectedMarketConditions,
    };

    // Prepare risk parameters
    const riskParameters = {
      maxRiskPerTrade,
    };

    try {
      await onSubmit({
        name,
        description: strategyDescription,
        timeframes: selectedTimeframes,
        isActive,
        isPublic,
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
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Top section: Basic Information and Risk Management */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* Basic Information */}
          <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                  <Lightbulb className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>{isEditMode ? "Update your strategy details" : "Define your trading strategy"}</CardDescription>
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
                  <FieldInfoTooltip content="Describe your strategy in detail, including how it works and when it should be used. The AI will use this description to help understand your strategy's intent." />
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
            </CardContent>
          </Card>

          {/* Risk Management */}
          <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                  <Settings className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Risk Management</CardTitle>
                  <CardDescription>Configure risk parameters for automated trading</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded text-sm text-amber-700 dark:text-amber-300">
                <p className="flex items-center mb-2">
                  <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="font-medium">Risk Management Notes</span>
                </p>
                <p className="mb-2">
                  The AI trading bot will determine optimal entry points, stop loss, and take profit levels based on real-time market analysis. You only need to set the maximum
                  risk per trade.
                </p>
                <p>The AI will automatically calculate position sizes to ensure your risk is never higher than the specified percentage.</p>
              </div>

              {/* Risk Management Parameters */}
              <div className="space-y-4">
                {/* Max Risk Per Trade */}
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label htmlFor="max-risk">Max Risk Per Trade</Label>
                    <FieldInfoTooltip content="The maximum percentage of your account that can be risked on a single trade. This determines position size and stop loss." />
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      id="max-risk"
                      type="number"
                      min="0.1"
                      max="10"
                      step="0.1"
                      value={maxRiskPerTrade}
                      onChange={(e) => setMaxRiskPerTrade(parseFloat(e.target.value))}
                      className="max-w-[180px]"
                    />
                    <span className="text-sm text-slate-500 dark:text-slate-400">% of account</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Indicators */}
        <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-3">
                <BarChart3 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Technical Indicators</CardTitle>
                <CardDescription>Add and configure indicators for your trading strategy</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded text-sm text-blue-700 dark:text-blue-300 mb-4">
              <p className="flex items-center mb-2">
                <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="font-medium">Indicator Usage</span>
              </p>
              <p>The AI will use these indicators as part of its market analysis. Configure them based on your preferred settings for optimal results.</p>
            </div>

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

            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {selectedIndicators.map((indicator, index) => {
                const indicatorInfo = indicatorOptions.find((opt) => opt.value === indicator.type);
                if (!indicatorInfo) return null;

                return (
                  <div key={index} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Select value={indicator.type} onValueChange={(value) => updateIndicatorType(index, value)}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select indicator" />
                        </SelectTrigger>
                        <SelectContent>
                          {indicatorOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              disabled={
                                selectedIndicators.some((ind) => ind.type === option.value && ind !== indicator) ||
                                (option.isOscillator && selectedIndicators.some((ind, i) => i !== index && indicatorOptions.find((opt) => opt.value === ind.type)?.isOscillator))
                              }>
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
                      {typeof indicatorInfo.defaultValue === "object" ? (
                        // Render multiple parameter inputs for complex indicators
                        Object.entries(indicatorInfo.defaultValue as IndicatorParameter).map(([paramKey, defaultValue]) => {
                          const minValue = (indicatorInfo.min as IndicatorParameter)[paramKey];
                          const maxValue = (indicatorInfo.max as IndicatorParameter)[paramKey];
                          return (
                            <div key={paramKey} className="flex items-center">
                              <Label htmlFor={`indicator-${index}-${paramKey}`} className="w-32">
                                {paramKey}
                              </Label>
                              <FieldInfoTooltip content={`Configure the ${paramKey} for this indicator.`} />
                              <div className="flex items-center gap-3 ml-2">
                                <Input
                                  id={`indicator-${index}-${paramKey}`}
                                  type="number"
                                  min={minValue}
                                  max={maxValue}
                                  value={indicator.config[paramKey] || defaultValue}
                                  onChange={(e) => updateIndicatorConfig(index, paramKey, parseInt(e.target.value))}
                                  className="max-w-[120px]"
                                />
                                <span className="text-sm text-slate-500 dark:text-slate-400">periods</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Render single parameter input for simple indicators
                        <div className="flex items-center">
                          <Label htmlFor={`indicator-${index}-period`} className="w-32">
                            Period
                          </Label>
                          <FieldInfoTooltip content="The number of candles used to calculate this indicator." />
                          <div className="flex items-center gap-3 ml-2">
                            <Input
                              id={`indicator-${index}-period`}
                              type="number"
                              min={indicatorInfo.min as number}
                              max={indicatorInfo.max as number}
                              value={indicator.config.period || (indicatorInfo.defaultValue as number)}
                              onChange={(e) => updateIndicatorConfig(index, "period", parseInt(e.target.value))}
                              className="max-w-[120px]"
                            />
                            <span className="text-sm text-slate-500 dark:text-slate-400">periods</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedIndicators.length === 0 && (
              <div className="text-center p-8 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
                <p>Add technical indicators for your trading strategy</p>
                <Button type="button" variant="outline" size="sm" onClick={addIndicator} className="mt-4">
                  Add First Indicator
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()} className="mr-2">
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
