"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/providers/notifications-provider";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "trade" | "strategy" | "performance" | "system";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: "low" | "medium" | "high";
}

interface NotificationsListProps {
  notifications: Notification[];
}

export function NotificationsList({ notifications }: NotificationsListProps) {
  const { markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-background border-border dark:bg-slate-950" align="end">
        <DropdownMenuLabel className="flex items-center justify-between bg-background dark:bg-slate-950">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={() => markAllAsRead()}>
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="dark:border-slate-800" />
        <DropdownMenuGroup className="max-h-[300px] overflow-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn("flex flex-col items-start p-4 cursor-default focus:bg-accent dark:focus:bg-slate-800/50", !notification.read && "bg-accent/50 dark:bg-slate-800/50")}
                onMouseEnter={() => {
                  if (!notification.read) {
                    markAsRead(notification.id);
                  }
                }}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-foreground dark:text-slate-100">{notification.title}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => clearNotification(notification.id)}>
                    <span className="sr-only">Delete notification</span>
                    <span className="text-lg leading-none">&times;</span>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">{notification.message}</p>
                <p className="text-xs text-muted-foreground dark:text-slate-500 mt-2">
                  {formatDistanceToNow(new Date(notification.timestamp), {
                    addSuffix: true,
                  })}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
