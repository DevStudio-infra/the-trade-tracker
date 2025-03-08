"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { useToast } from "@/components/ui/use-toast";

interface Notification {
  id: string;
  type: "trade" | "strategy" | "performance" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high";
}

interface NotificationsContextType {
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

async function fetchNotifications(): Promise<Notification[]> {
  // TODO: Replace with actual API call
  return [
    {
      id: "1",
      type: "trade",
      title: "Trade Executed",
      message: "Buy order for EURUSD filled at 1.0842",
      timestamp: new Date().toISOString(),
      read: false,
      priority: "high",
    },
    {
      id: "2",
      type: "strategy",
      title: "New Signal Generated",
      message: "Breakout strategy detected potential setup for GBPUSD",
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      read: false,
      priority: "medium",
    },
    {
      id: "3",
      type: "performance",
      title: "Performance Alert",
      message: "Your win rate has increased to 65% this week",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: true,
      priority: "low",
    },
  ];
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  const { data: notifications, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsRead = useCallback(
    async (id: string) => {
      // TODO: Implement API call
      console.log("Marking notification as read:", id);
      refetch();
    },
    [refetch]
  );

  const markAllAsRead = useCallback(async () => {
    // TODO: Implement API call
    console.log("Marking all notifications as read");
    refetch();
  }, [refetch]);

  const clearNotification = useCallback(
    async (id: string) => {
      // TODO: Implement API call
      console.log("Clearing notification:", id);
      refetch();
    },
    [refetch]
  );

  // Show toast for new high-priority notifications
  React.useEffect(() => {
    if (notifications) {
      const unreadHighPriority = notifications.filter((n) => !n.read && n.priority === "high");
      unreadHighPriority.forEach((notification) => {
        toast({
          title: notification.title,
          description: notification.message,
          variant: "default",
        });
      });
    }
  }, [notifications, toast]);

  return (
    <NotificationsContext.Provider
      value={{
        markAsRead,
        markAllAsRead,
        clearNotification,
      }}>
      {children}
      <NotificationsList notifications={notifications || []} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
