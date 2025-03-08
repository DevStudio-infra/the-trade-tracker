import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface CreditBalance {
  credits: number;
  subscription_plan: "free" | "pro";
  next_renewal: string;
}

async function fetchCreditBalance(): Promise<CreditBalance> {
  const response = await fetch("/api/v1/credits/balance");
  if (!response.ok) {
    throw new Error("Failed to fetch credit balance");
  }
  const data = await response.json();
  return data.data;
}

export function CreditBalance() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["credits", "balance"],
    queryFn: fetchCreditBalance,
  });

  const maxCredits = data?.subscription_plan === "pro" ? 100 : 6;
  const percentage = data ? (data.credits / maxCredits) * 100 : 0;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>AI Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>AI Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load credit information</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Credits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24">
            <CircularProgressbar
              value={percentage}
              text={`${data?.credits}`}
              styles={buildStyles({
                textSize: "24px",
                pathColor: percentage < 20 ? "#ef4444" : "#22c55e",
                textColor: "#64748b",
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
            <Button className="w-full" variant={percentage < 20 ? "destructive" : "outline"}>
              {percentage < 20 ? "Buy Credits" : "Manage Credits"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
