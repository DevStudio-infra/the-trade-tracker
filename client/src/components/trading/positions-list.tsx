"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTradingStore } from "@/stores/trading-store";
import { useApi } from "@/lib/api";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, X, RefreshCw, BarChart } from "lucide-react";

interface Position {
  tradeId: string;
  pair: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  quantity: number;
  pnl: number;
  pnlPercentage: number;
  openTime: string;
}

export function PositionsList() {
  const { selectedBroker } = useTradingStore();
  const api = useApi();
  const queryClient = useQueryClient();
  const [isClosing, setIsClosing] = useState<string | null>(null);

  // Fetch positions
  const {
    data: positions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["positions", selectedBroker?.id],
    queryFn: async () => {
      try {
        if (!selectedBroker) return [];
        const response = await api.getPositions();
        return response;
      } catch (error) {
        console.error("Error fetching positions:", error);
        return [];
      }
    },
    enabled: !!selectedBroker,
    refetchInterval: 60000, // Refresh every minute
  });

  // Close position mutation
  const closeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      return await api.closePosition(tradeId);
    },
    onSuccess: () => {
      toast.success("Position closed successfully");
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      setIsClosing(null);
    },
    onError: (error) => {
      toast.error("Failed to close position");
      console.error("Error closing position:", error);
      setIsClosing(null);
    },
  });

  // Handle close position
  const handleClosePosition = (tradeId: string) => {
    setIsClosing(tradeId);
    closeMutation.mutate(tradeId);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  if (!selectedBroker) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a broker to view positions</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">Error loading positions</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Open Positions</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="text-center space-y-4 py-6">
            <BarChart className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">No open positions</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>P/L</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((position: Position) => (
                <TableRow key={position.tradeId}>
                  <TableCell className="font-medium">{position.pair}</TableCell>
                  <TableCell>
                    <Badge variant={position.side === "BUY" ? "default" : "destructive"} className="flex items-center w-16 justify-center">
                      {position.side === "BUY" ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                      {position.side}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div>{formatCurrency(position.entryPrice)}</div>
                    <div className="text-muted-foreground">{position.quantity} units</div>
                  </TableCell>
                  <TableCell>
                    <div className={position.pnl >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>{formatCurrency(position.pnl)}</div>
                    <div className="text-xs text-muted-foreground">{formatPercentage(position.pnlPercentage)}</div>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleClosePosition(position.tradeId)} disabled={isClosing === position.tradeId}>
                      {isClosing === position.tradeId ? <RefreshCw className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
