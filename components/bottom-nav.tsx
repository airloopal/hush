"use client";

import * as React from "react";
import Link from "next/link";
import { Compass, MessagesSquare, LayoutGrid, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BottomNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

const defaultItems: BottomNavItem[] = [
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Chats", href: "/chats", icon: MessagesSquare },
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Settings", href: "/settings", icon: Settings },
];

export interface BottomNavProps {
  items?: BottomNavItem[];
  activeHref?: string;
  className?: string;
}

/** Fixed bottom tab bar shown below `md`. Pair with NavigationBar. */
export function BottomNav({ items = defaultItems, activeHref, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 backdrop-blur md:hidden",
        "pb-[env(safe-area-inset-bottom)]",
        className
      )}
      aria-label="Primary"
    >
      {items.map((item) => {
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
                  {item.badge}
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
