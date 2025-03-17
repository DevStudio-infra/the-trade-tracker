"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Lightbulb, Zap, TrendingUp, ArrowRightLeft, Search, Trash2, Edit, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { strategyService, Strategy } from "@/services/strategy";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";

// Default icon mapping for strategies
const strategyIcons = {
  "trend-following": TrendingUp,
  "mean-reversion": ArrowRightLeft,
  breakout: Zap,
  // Default fallback
  default: Lightbulb,
};

export default function StrategiesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [strategyToDelete, setStrategyToDelete] = useState<Strategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch strategies on page load
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setLoading(true);
        const data = await strategyService.getStrategies();
        setStrategies(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch strategies:", err);
        setError("Failed to load strategies. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load strategies",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [toast]);

  // Filter strategies based on search term
  const filteredStrategies = strategies.filter(
    (strategy) => strategy.name.toLowerCase().includes(searchTerm.toLowerCase()) || strategy.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle strategy deletion
  const handleDeleteClick = (strategy: Strategy) => {
    setStrategyToDelete(strategy);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!strategyToDelete) return;

    try {
      await strategyService.deleteStrategy(strategyToDelete.id);
      setStrategies(strategies.filter((s) => s.id !== strategyToDelete.id));
      toast({
        title: "Success",
        description: "Strategy deleted successfully",
      });
    } catch (err) {
      console.error("Failed to delete strategy:", err);
      toast({
        title: "Error",
        description: "Failed to delete strategy",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setStrategyToDelete(null);
    }
  };

  // Get icon for strategy
  const getStrategyIcon = (strategy: Strategy) => {
    const idSlug = strategy.name.toLowerCase().replace(/\s+/g, "-");
    // @ts-expect-error - We're handling unknown keys with a fallback
    return strategyIcons[idSlug] || strategyIcons.default;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent dark:from-blue-950/50 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

      {/* Main content */}
      <div className="relative p-6 space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Trading Strategies</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage your automated trading strategies</p>
          </div>
          <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => router.push("/strategies/create")}>
            <Lightbulb className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <Input
              className="pl-9 bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
              placeholder="Search strategies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent dark:border-blue-400"></div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Loading strategies...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredStrategies.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <Lightbulb className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No strategies found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">{searchTerm ? "Try adjusting your search term" : "Get started by creating your first trading strategy"}</p>
            {!searchTerm && (
              <Button className="mt-6 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700" onClick={() => router.push("/strategies/create")}>
                Create Strategy
              </Button>
            )}
          </div>
        )}

        {/* Strategy cards */}
        {!loading && filteredStrategies.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStrategies.map((strategy) => {
              const Icon = getStrategyIcon(strategy);
              return (
                <Card key={strategy.id} className="relative overflow-hidden backdrop-blur-sm bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
                  {/* Gradient background */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80 dark:opacity-40", "from-blue-500/5 to-blue-500/10")} />

                  {/* Content */}
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg">
                        <Icon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                      </div>
                      <Badge variant="outline" className="font-medium text-sm border-slate-200 dark:border-slate-800 text-blue-500 dark:text-blue-400">
                        {strategy.performance || "+0.0%"}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{strategy.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{strategy.description}</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Signals Generated</div>
                        <div className="text-2xl font-semibold text-slate-900 dark:text-white">{strategy.signals || 0}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Win Rate</div>
                        <div className="text-2xl font-semibold text-blue-500 dark:text-blue-400">{strategy.winRate || "0%"}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                        onClick={() => router.push(`/strategies/${strategy.id}`)}>
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        className="p-2 h-auto border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => router.push(`/strategies/${strategy.id}/edit`)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="p-2 h-auto border-slate-200 dark:border-slate-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-300"
                        onClick={() => handleDeleteClick(strategy)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the strategy &ldquo;{strategyToDelete?.name}&rdquo;. This action cannot be undone.</AlertDialogDescription>
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
