"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
}

export interface NavigationBarProps {
  items?: NavItem[];
  activeHref?: string;
  user?: { name: string; avatarUrl?: string };
  notificationCount?: number;
  className?: string;
}

const defaultItems: NavItem[] = [
  { label: "Discover", href: "/discover" },
  { label: "Chats", href: "/chats" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Inbox", href: "/inbox" },
];

/** Primary top navigation. Hidden below `md`; pair with BottomNav on mobile. */
export function NavigationBar({
  items = defaultItems,
  activeHref,
  user,
  notificationCount = 0,
  className,
}: NavigationBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 hidden w-full border-b border-border bg-background/90 backdrop-blur md:block",
        className
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
              <MessageCircle className="h-4 w-4" />
            </span>
            Hush
          </Link>
          <nav className="flex items-center gap-1">
            {items.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast ease-signal",
                    isActive
                      ? "bg-surface-muted text-text-primary"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label={`Notifications (${notificationCount} unread)`}>
            <span className="relative">
              <Bell className="h-4 w-4" />
              {notificationCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 font-mono-data text-[10px] text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </span>
          </Button>
          {user && <Avatar src={user.avatarUrl} alt={user.name} size="sm" />}
        </div>
      </div>
    </header>
  );
}
