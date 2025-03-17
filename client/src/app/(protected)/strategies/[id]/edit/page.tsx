"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { strategyService, Strategy, UpdateStrategyDto } from "@/services/strategy";
import { StrategyForm } from "@/components/strategies/StrategyForm";

export default function EditStrategyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch strategy on page load
  useEffect(() => {
    const fetchStrategy = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching strategy with ID:", params.id);

        const data = await strategyService.getStrategy(params.id);
        console.log("Strategy fetched successfully:", data);

        setStrategy(data);
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

  // Handle form submission
  const handleSubmit = async (formData: { name: string; description: string; timeframes: string[]; isActive: boolean }) => {
    setSubmitError(null);

    try {
      setSubmitting(true);
      console.log("Updating strategy with data:", JSON.stringify(formData, null, 2));

      const updatedStrategy = await strategyService.updateStrategy(params.id, formData as UpdateStrategyDto);
      console.log("Strategy updated successfully:", updatedStrategy);

      toast({
        title: "Success",
        description: "Strategy updated successfully!",
      });

      router.push(`/strategies/${params.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while updating strategy";

      console.error("Error updating strategy:", error);
      console.error("Strategy data that failed:", formData);
      setSubmitError(errorMessage);

      toast({
        title: "Error",
        description: "Failed to update strategy. Please check the form and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Strategy</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Update your trading strategy configuration</p>
          </div>
        </div>

        {/* Error message for loading */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Error loading strategy</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">Please check your network connection and try again. If the problem persists, contact support.</p>
            </div>
          </div>
        )}

        {/* Error message for submission */}
        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start mb-6">
            <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-3 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Error updating strategy</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{submitError}</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">Please check your form entries and try again.</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent dark:border-blue-400"></div>
            <p className="mt-4 text-slate-500 dark:text-slate-400">Loading strategy...</p>
          </div>
        )}

        {!loading && strategy && <StrategyForm initialData={strategy} onSubmit={handleSubmit} isSubmitting={submitting} submitLabel="Update Strategy" isEditMode={true} />}
      </div>
    </div>
  );
}
