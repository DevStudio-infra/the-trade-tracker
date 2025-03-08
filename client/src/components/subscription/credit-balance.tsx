"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useQuery } from "@tanstack/react-query";

interface CreditBalance {
  credits: number;
  subscription_plan: "free" | "pro";
  next_renewal: string;
}

async function fetchCreditBalance(): Promise<CreditBalance> {
  // TODO: Replace with actual API call
  return {
    credits: 42,
    subscription_plan: "free",
    next_renewal: "2024-04-15",
  };
}

export function CreditBalance() {
  const { data, isLoading } = useQuery({
    queryKey: ["credits", "balance"],
    queryFn: fetchCreditBalance,
  });

  const maxCredits = data?.subscription_plan === "pro" ? 100 : 6;
  const percentage = data ? (data.credits / maxCredits) * 100 : 0;
  const isLowCredits = data?.credits && data.credits < maxCredits * 0.2;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>AI Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-muted" />
            <div className="flex-1 space-y-4">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Credits Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24">
            <CircularProgressbar
              value={percentage}
              text={`${data?.credits}`}
              styles={buildStyles({
                textSize: "24px",
                pathColor: isLowCredits ? "#ef4444" : "#22c55e",
                textColor: "var(--foreground)",
                trailColor: "var(--muted)",
              })}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-lg font-medium">
                {data?.credits} / {maxCredits}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Renewal</p>
              <p className="text-sm">{data?.next_renewal ? new Date(data.next_renewal).toLocaleDateString() : "-"}</p>
            </div>
            <Button className="w-full" variant={isLowCredits ? "destructive" : "outline"}>
              {isLowCredits ? "Buy Credits" : "Manage Credits"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
