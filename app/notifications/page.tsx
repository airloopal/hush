"use client";

import * as React from "react";
import {
  Bell,
  Camera,
  CheckCheck,
  CreditCard,
  Flag,
  MessageCircle,
  Receipt,
  RefreshCcw,
  Timer,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRequireAccount } from "@/lib/use-account-guard";
import {
  deleteNotification,
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { syncFanExpiryNotifications } from "@/lib/chat";
import { formatRelativeShort } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/notifications-types";

const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  "creator-replied": MessageCircle,
  "chat-expiring": Timer,
  "chat-expired": Timer,
  "chat-renewed": RefreshCcw,
  "live-photo-fulfilled": Camera,
  "live-video-fulfilled": Video,
  "purchase-completed": Receipt,
  "report-updated": Flag,
  "payment-issue-updated": CreditCard,
};

export default function NotificationsPage() {
  const { ready, account } = useRequireAccount();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  React.useEffect(() => {
    if (!ready || !account) return;
    if (account.role === "fan") syncFanExpiryNotifications(account.username);
    setNotifications(getNotificationsForUser(account.username));
  }, [ready, account]);

  if (!ready || !account) return null;

  function refresh() {
    if (account) setNotifications(getNotificationsForUser(account.username));
  }

  function handleMarkRead(id: string) {
    markNotificationRead(id);
    refresh();
  }

  function handleMarkAllRead() {
    if (!account) return;
    markAllNotificationsRead(account.username);
    refresh();
  }

  function handleDelete(id: string) {
    deleteNotification(id);
    refresh();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/notifications" user={{ name: account.username }} />

      <main className="container flex max-w-2xl flex-col gap-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="text-sm text-text-muted">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Creator replies, expiry warnings, and media updates will show up here."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] ?? Bell;
              return (
                <li key={notification.id}>
                  <Card className={notification.read ? undefined : "border-emerald/40 bg-emerald/5"}>
                    <CardContent className="flex items-start gap-3 p-4">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted text-text-muted"
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{notification.title}</span>
                          {!notification.read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald" aria-label="Unread" />
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">{notification.description}</p>
                        <span className="text-xs text-text-muted">
                          {formatRelativeShort(notification.createdAt)}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Mark as read"
                            onClick={() => handleMarkRead(notification.id)}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete notification"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <BottomNav activeHref="/notifications" />
    </div>
  );
}
