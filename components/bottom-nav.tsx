"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Compass, LayoutGrid, MessagesSquare, Settings, Users, type LucideIcon } from "lucide-react";
import { useUnreadNotificationCount } from "@/lib/use-unread-notifications";
import { useCurrentDemoUser } from "@/lib/use-demo-session";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface BottomNavProps {
  items?: BottomNavItem[];
  activeHref?: string;
  className?: string;
}

/** Fixed bottom tab bar shown below `md`. Pair with NavigationBar. */
export function BottomNav({ items, activeHref, className }: BottomNavProps) {
  const notificationCount = useUnreadNotificationCount();
  const session = useCurrentDemoUser();

  const fanItems: BottomNavItem[] = [
    { label: "Discover", href: "/discover", icon: Compass },
    { label: "Chats", href: "/chats", icon: MessagesSquare },
    { label: "Alerts", href: "/notifications", icon: Bell, badge: notificationCount },
    { label: "Settings", href: "/settings", icon: Settings },
  ];
  const creatorItems: BottomNavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { label: "Conversations", href: "/conversations", icon: Users },
    { label: "Alerts", href: "/notifications", icon: Bell, badge: notificationCount },
    { label: "Settings", href: "/settings", icon: Settings },
  ];
  const fallbackItems: BottomNavItem[] = [
    { label: "Discover", href: "/discover", icon: Compass },
    { label: "Chats", href: "/chats", icon: MessagesSquare },
    { label: "Alerts", href: "/notifications", icon: Bell, badge: notificationCount },
    { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const resolvedItems: BottomNavItem[] =
    items ?? (session?.role === "creator" ? creatorItems : session?.role === "fan" ? fanItems : fallbackItems);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      aria-label="Primary"
    >
      {resolvedItems.map((item) => {
        const isActive = activeHref === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-text-secondary"
          >
            <span className="relative">
              <Icon className={cn("h-5 w-5", isActive && "text-emerald")} strokeWidth={isActive ? 2.25 : 2} />
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-pill bg-danger px-1 font-mono-data text-[9px] text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </span>
            <span className={cn("text-[11px] font-medium", isActive && "text-text-primary")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
