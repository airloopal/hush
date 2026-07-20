"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "@/components/account-menu";
import { DemoBanner } from "@/components/demo-banner";
import { useUnreadNotificationCount } from "@/lib/use-unread-notifications";
import { useCurrentDemoUser } from "@/lib/use-demo-session";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
}

export interface NavigationBarProps {
  items?: NavItem[];
  activeHref?: string;
  /** Fallback avatar shown only when there's no real demo session (e.g.
   * /design-system, which has no logged-in user). Real protected pages can
   * keep passing this — it's ignored once a session exists. */
  user?: { name: string; avatarUrl?: string };
  /** Optional override — omit to use the live unread count automatically. */
  notificationCount?: number;
  className?: string;
}

const FAN_ITEMS: NavItem[] = [
  { label: "Discover", href: "/discover" },
  { label: "Chats", href: "/chats" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
];

const CREATOR_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Conversations", href: "/conversations" },
  { label: "Notifications", href: "/notifications" },
  { label: "Settings", href: "/settings" },
];

const FALLBACK_ITEMS: NavItem[] = [
  { label: "Discover", href: "/discover" },
  { label: "Chats", href: "/chats" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Settings", href: "/settings" },
];

/** Primary top navigation for authenticated app pages. Always visible (a
 * slim bar on mobile, full nav from `md` up) — pair with BottomNav for
 * mobile section navigation. */
export function NavigationBar({ items, activeHref, user, notificationCount, className }: NavigationBarProps) {
  const liveCount = useUnreadNotificationCount();
  const count = notificationCount ?? liveCount;
  const session = useCurrentDemoUser();

  const resolvedItems =
    items ?? (session?.role === "creator" ? CREATOR_ITEMS : session?.role === "fan" ? FAN_ITEMS : FALLBACK_ITEMS);

  return (
    <>
      <header className={cn("sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur", className)}>
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">Hush</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {resolvedItems.map((item) => {
                const isActive = activeHref === item.href;
                const isNotifications = item.href === "/notifications";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-signal",
                      isActive ? "bg-surface-muted text-text-primary" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {item.label}
                    {isNotifications && count > 0 && (
                      <span
                        aria-label={`${count} unread notifications`}
                        className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 font-mono-data text-[10px] text-white"
                      >
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <AccountMenu user={session} />
            ) : (
              user && <Avatar src={user.avatarUrl} alt={user.name} size="sm" />
            )}
          </div>
        </div>
      </header>
      {session && <DemoBanner />}
    </>
  );
}
