"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

interface Payment {
  id: string;
  date: string;
  amount: number;
  type: "subscription" | "credits";
  status: "completed" | "pending" | "failed";
}

async function fetchPaymentHistory(): Promise<Payment[]> {
  // TODO: Replace with actual API call
  return [
    {
      id: "1",
      date: "2024-03-15",
      amount: 19.99,
      type: "subscription",
      status: "completed",
    },
    {
      id: "2",
      date: "2024-03-10",
      amount: 5.5,
      type: "credits",
      status: "completed",
    },
    {
      id: "3",
      date: "2024-03-01",
      amount: 19.99,
      type: "subscription",
      status: "completed",
    },
  ];
}

export function PaymentHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["payments", "history"],
    queryFn: fetchPaymentHistory,
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data?.length === 0 ? (
            <p className="text-center text-muted-foreground">No payment history</p>
          ) : (
            data?.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="space-y-1">
                  <p className="font-medium">{payment.type === "subscription" ? "Monthly Subscription" : "Credit Purchase"}</p>
                  <p className="text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-medium">€{payment.amount.toFixed(2)}</p>
                  <p className={`text-sm ${getStatusColor(payment.status)}`}>{payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: Payment["status"]) {
  switch (status) {
    case "completed":
      return "text-green-500";
    case "pending":
      return "text-yellow-500";
    case "failed":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}
