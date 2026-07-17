"use client";

import { DollarSign, MessagesSquare, Sparkles, Timer } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardCard } from "@/components/dashboard-card";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { useRequireAccount } from "@/lib/use-account-guard";

// Stage 1 has no real chat/earnings data yet — these are static placeholder
// metrics so the dashboard layout is real even before chats exist.
const placeholderMetrics = [
  { label: "Active chats", value: "0", icon: MessagesSquare, accent: "neutral" as const },
  { label: "Chats expiring soon", value: "0", icon: Timer, accent: "amber" as const },
  { label: "Est. earnings (mo.)", value: "$0", icon: DollarSign, accent: "neutral" as const },
  { label: "Sponsored boost views", value: "0", icon: Sparkles, accent: "violet" as const },
];

export default function DashboardPage() {
  const { ready, account } = useRequireAccount();

  if (!ready || !account) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/dashboard" user={{ name: account.username }} />

      <main className="container flex flex-col gap-10 py-10">
        <div className="flex items-center gap-4">
          <Avatar
            src={account.role === "creator" ? account.avatarDataUrl : undefined}
            alt={account.username}
            size="lg"
            online
          />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">@{account.username}</h1>
            <div className="flex items-center gap-2">
              <CategoryPill variant="neutral" className="capitalize">
                {account.role}
              </CategoryPill>
              {account.role === "creator" && (
                <CategoryPill variant={account.isAdult ? "amber" : "neutral"}>
                  {account.category}
                </CategoryPill>
              )}
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {placeholderMetrics.map((metric) => (
              <DashboardCard key={metric.label} {...metric} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Active Conversations</h2>
          <EmptyState
            icon={MessagesSquare}
            title="No active conversations yet"
            description="Conversations will appear here once a fan unlocks 24-hour chat access with you. Chat functionality is coming in a later stage."
          />
        </section>
      </main>

      <BottomNav activeHref="/dashboard" />
    </div>
  );
}
