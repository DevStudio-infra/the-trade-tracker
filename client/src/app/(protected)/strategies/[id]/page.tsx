"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Lightbulb, Zap, TrendingUp, ArrowRightLeft, Edit, Trash2, AlertCircle, BarChart3, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { strategyService, Strategy } from "@/services/strategy";
import { useToast } from "@/components/ui/use-toast";

// Default icon mapping for strategies
const strategyIcons = {
  "trend-following": TrendingUp,
  "mean-reversion": ArrowRightLeft,
  breakout: Zap,
  // Default fallback
  default: Lightbulb,
};

export default function StrategyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        setLoading(true);
        const data = await strategyService.getStrategy(params.id);
        setStrategy(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch strategy:", err);
        setError("Failed to load strategy. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load strategy",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStrategy();
  }, [params.id, toast]);

  // Handle strategy deletion
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await strategyService.deleteStrategy(params.id);
      toast({
        title: "Success",
        description: "Strategy deleted successfully",
      });
      router.push("/strategies");
    } catch (err) {
      console.error("Failed to delete strategy:", err);
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  // Get icon for strategy
  const getStrategyIcon = () => {
    if (!strategy) return strategyIcons.default;
    const idSlug = strategy.name.toLowerCase().replace(/\s+/g, "-");
    // @ts-expect-error - We're handling unknown keys with a fallback
    return strategyIcons[idSlug] || strategyIcons.default;
  };

  const Icon = getStrategyIcon();

  // Format rule display
  const formatRuleCondition = (condition: string) => {
    return condition.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Format value for display
  const formatValue = (value: unknown): string => {
    if (typeof value === "boolean") {
      return value ? "Enabled" : "Disabled";
    }
    if (value === null || value === undefined) {
      return "Not specified";
    }
    return String(value);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1200px] mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => router.push("/strategies")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Strategies
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent dark:border-blue-400"></div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Loading strategy...</p>
          </div>
        )}

        {!loading && strategy && (
          <>
            {/* Strategy header */}
            <div className="flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
              <div className="flex items-center">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg mr-4">
                  <Icon className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{strategy.name}</h1>
                    <Badge
                      variant={strategy.isActive ? "default" : "outline"}
                      className={
                        strategy.isActive
                          ? "bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700"
                          : "text-red-500 border-red-200 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                      }>
                      {strategy.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {strategy.rules?.type && (
                      <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50">
                        {formatRuleCondition(strategy.rules.type)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">{strategy.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {strategy.timeframes?.map((timeframe) => (
                      <Badge key={timeframe} variant="outline" className="text-sm text-slate-600 dark:text-slate-400 bg-transparent">
                        {timeframe}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="text-sm text-slate-600 dark:text-slate-400 bg-transparent">
                      Created {new Date(strategy.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 self-end md:self-auto">
                <Button variant="outline" className="border-slate-200 dark:border-slate-800" onClick={() => router.push(`/strategies/${params.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                  onClick={handleDeleteClick}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3 mt-6">
              <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-400/5 pointer-events-none"></div>
                <CardHeader className="pb-2 relative">
                  <CardDescription>Performance</CardDescription>
                  <CardTitle className="text-xl text-blue-500 dark:text-blue-400">{strategy.performance || "+0.0%"}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/10 dark:from-green-500/10 dark:to-green-400/5 pointer-events-none"></div>
                <CardHeader className="pb-2 relative">
                  <CardDescription>Total Signals</CardDescription>
                  <CardTitle className="text-xl">{strategy.signals || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-500/10 dark:from-purple-500/10 dark:to-purple-400/5 pointer-events-none"></div>
                <CardHeader className="pb-2 relative">
                  <CardDescription>Win Rate</CardDescription>
                  <CardTitle className="text-xl text-green-500 dark:text-green-400">{strategy.winRate || "0%"}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Tabs for details, history, etc. */}
            <Tabs defaultValue="overview" className="mt-10">
              <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      <CardTitle>Strategy Overview</CardTitle>
                    </div>
                    <CardDescription>General information about this trading strategy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Timeframes</h3>
                      <div className="flex flex-wrap gap-2">
                        {strategy.timeframes?.map((timeframe) => (
                          <Badge
                            key={timeframe}
                            className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50">
                            {timeframe}
                          </Badge>
                        ))}
                        {(!strategy.timeframes || strategy.timeframes.length === 0) && <span className="text-sm text-slate-500 dark:text-slate-400">No timeframes specified</span>}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Strategy Type</h3>
                      <Badge className="bg-green-50 text-green-700 border-green-100 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/50">
                        {strategy.rules?.type ? formatRuleCondition(strategy.rules.type) : "Not specified"}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Market Conditions</h3>
                      <div className="flex flex-wrap gap-2">
                        {strategy.rules?.market_conditions?.map((condition) => (
                          <Badge
                            key={condition}
                            className="bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/50">
                            {formatRuleCondition(condition)}
                          </Badge>
                        ))}
                        {(!strategy.rules?.market_conditions || strategy.rules.market_conditions.length === 0) && (
                          <span className="text-sm text-slate-500 dark:text-slate-400">No market conditions specified</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rules" className="mt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle>Entry Rules</CardTitle>
                      <CardDescription>Conditions that trigger strategy entry</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {strategy.rules?.entry?.conditions.length > 0 ? (
                        <ul className="space-y-3">
                          {strategy.rules.entry.conditions.map((rule, index) => (
                            <li key={index} className="flex items-start border-b border-slate-100 dark:border-slate-800 pb-3 last:border-none">
                              <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 mr-3 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">{formatRuleCondition(rule.condition)}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  {Object.entries(rule.parameters).map(([key, value]) => (
                                    <span key={key} className="mr-3">
                                      {formatRuleCondition(key)}: <span className="font-medium text-slate-700 dark:text-slate-300">{formatValue(value)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-6">No entry rules defined</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <CardTitle>Exit Rules</CardTitle>
                      <CardDescription>Conditions that trigger strategy exit</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {strategy.rules?.exit?.conditions.length > 0 ? (
                        <ul className="space-y-3">
                          {strategy.rules.exit.conditions.map((rule, index) => (
                            <li key={index} className="flex items-start border-b border-slate-100 dark:border-slate-800 pb-3 last:border-none">
                              <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 mr-3 mt-0.5">
                                <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                              </div>
                              <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200">{formatRuleCondition(rule.condition)}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  {Object.entries(rule.parameters).map(([key, value]) => (
                                    <span key={key} className="mr-3">
                                      {formatRuleCondition(key)}: <span className="font-medium text-slate-700 dark:text-slate-300">{formatValue(value)}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-6">No exit rules defined</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 mt-6">
                  <CardHeader>
                    <CardTitle>Indicators</CardTitle>
                    <CardDescription>Technical indicators used in this strategy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {strategy.rules?.indicators && Object.keys(strategy.rules.indicators).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(strategy.rules.indicators).map(([name, value]) => (
                          <div key={name} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                            <div className="text-sm text-slate-500 dark:text-slate-400">{formatRuleCondition(name)}</div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">{formatValue(value)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-6">No indicators defined</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <Card className="bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                      <CardTitle>Risk Parameters</CardTitle>
                    </div>
                    <CardDescription>Risk management settings for this strategy</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {strategy.riskParameters && Object.keys(strategy.riskParameters).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(strategy.riskParameters).map(([name, value]) => (
                          <div key={name} className="border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{formatRuleCondition(name)}</div>
                            <div className="font-medium text-slate-800 dark:text-slate-200">{formatValue(value)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 dark:text-slate-400 py-6">No risk parameters defined</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the strategy &ldquo;{strategy?.name}&rdquo;. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
