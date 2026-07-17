"use client";

import * as React from "react";
import { DollarSign, MessagesSquare, Sparkles, Timer } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardCard } from "@/components/dashboard-card";
import { EmptyState } from "@/components/empty-state";
import { DashboardConversationRow } from "@/components/dashboard-conversation-row";
import { CategoryPill } from "@/components/ui/category-pill";
import { Avatar } from "@/components/ui/avatar";
import { useRequireAccount } from "@/lib/use-account-guard";
import {
  getAllSessionsForCreator,
  getLastMessage,
  getRemainingMs,
  isSessionActive,
} from "@/lib/chat";
import type { ChatSession } from "@/lib/chat-types";

// Stage 1 had no real chat/earnings data; earnings/boost metrics stay
// static placeholders in Stage 2 too — only Active Conversations is real.
const placeholderMetrics = [
  { label: "Est. earnings (mo.)", value: "$0", icon: DollarSign, accent: "neutral" as const },
  { label: "Sponsored boost views", value: "0", icon: Sparkles, accent: "violet" as const },
];

type SortMode = "expiring" | "recent";

export default function DashboardPage() {
  const { ready, account } = useRequireAccount();
  const [sortMode, setSortMode] = React.useState<SortMode>("expiring");
  const [sessions, setSessions] = React.useState<ChatSession[]>([]);

  React.useEffect(() => {
    if (!ready || !account || account.role !== "creator") return;
    setSessions(getAllSessionsForCreator(account.username).filter(isSessionActive));
  }, [ready, account]);

  if (!ready || !account) return null;

  const isCreator = account.role === "creator";

  const sortedSessions = [...sessions].sort((a, b) => {
    if (sortMode === "expiring") return getRemainingMs(a) - getRemainingMs(b);
    const lastA = getLastMessage(a.id)?.sentAt ?? a.startedAt;
    const lastB = getLastMessage(b.id)?.sentAt ?? b.startedAt;
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });

  const activeChatsCount = sessions.length;
  const expiringSoonCount = sessions.filter((s) => getRemainingMs(s) < 6 * 60 * 60 * 1000).length;

  const overviewMetrics = [
    { label: "Active chats", value: String(activeChatsCount), icon: MessagesSquare, accent: "neutral" as const },
    { label: "Chats expiring soon", value: String(expiringSoonCount), icon: Timer, accent: "amber" as const },
    ...placeholderMetrics,
  ];

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
            {(isCreator ? overviewMetrics : placeholderMetrics).map((metric) => (
              <DashboardCard key={metric.label} {...metric} />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Active Conversations</h2>
            {isCreator && sortedSessions.length > 0 && (
              <div className="flex gap-1.5">
                <CategoryPill
                  variant="neutral"
                  selected={sortMode === "expiring"}
                  onClick={() => setSortMode("expiring")}
                >
                  Expiring soon
                </CategoryPill>
                <CategoryPill
                  variant="neutral"
                  selected={sortMode === "recent"}
                  onClick={() => setSortMode("recent")}
                >
                  Recent activity
                </CategoryPill>
              </div>
            )}
          </div>

          {!isCreator ? (
            <EmptyState
              icon={MessagesSquare}
              title="No active conversations yet"
              description="Conversations will appear here once you unlock 24-hour chat access with a creator. Manage your own chats from the Chats tab."
            />
          ) : sortedSessions.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No active conversations yet"
              description="Conversations will appear here once a fan unlocks 24-hour chat access with you."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sortedSessions.map((session) => (
                <DashboardConversationRow
                  key={session.id}
                  session={session}
                  lastMessage={getLastMessage(session.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav activeHref="/dashboard" />
    </div>
  );
}
