"use client";

import * as React from "react";
import { Camera, DollarSign, FileWarning, MessagesSquare, Receipt, Timer, UserX } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardCard } from "@/components/dashboard-card";
import { EmptyState } from "@/components/empty-state";
import { DashboardConversationRow } from "@/components/dashboard-conversation-row";
import { MediaRequestCard } from "@/components/media-request-card";
import { CategoryPill } from "@/components/ui/category-pill";
import { Avatar } from "@/components/ui/avatar";
import { useRequireRole } from "@/lib/use-account-guard";
import {
  getAllSessionsForCreator,
  getLastMessage,
  getPendingMediaPurchasesForCreator,
  getRemainingMs,
  getSessionEarnings,
  getTodaysEarningsForCreator,
  isExpiringToday,
  isSessionActive,
} from "@/lib/chat";
import { getCreatorTrustMetrics, getPaymentIssuesForCreator, getReportsForCreator } from "@/lib/trust";
import type { ChatSession, MediaPurchase } from "@/lib/chat-types";

// Fan-side dashboard has no real chat data yet — same static placeholders
// carried over from earlier stages.
const fanPlaceholderMetrics = [
  { label: "Active chats", value: "0", icon: MessagesSquare, accent: "neutral" as const },
  { label: "Est. earnings (mo.)", value: "$0", icon: DollarSign, accent: "neutral" as const },
];

type SortMode = "expiring" | "recent" | "spending";

export default function DashboardPage() {
  const { ready, account } = useRequireRole("creator");
  const [sortMode, setSortMode] = React.useState<SortMode>("expiring");
  const [allSessions, setAllSessions] = React.useState<ChatSession[]>([]);
  const [pendingRequests, setPendingRequests] = React.useState<MediaPurchase[]>([]);
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    if (!ready || !account || account.role !== "creator") return;
    setAllSessions(getAllSessionsForCreator(account.username));
    setPendingRequests(getPendingMediaPurchasesForCreator(account.username));
  }, [ready, account, version]);

  if (!ready || !account) return null;

  const isCreator = account.role === "creator";
  const activeSessions = allSessions.filter(isSessionActive);

  const sortedActiveSessions = [...activeSessions].sort((a, b) => {
    if (sortMode === "expiring") return getRemainingMs(a) - getRemainingMs(b);
    if (sortMode === "spending") return getSessionEarnings(b).total - getSessionEarnings(a).total;
    const lastA = getLastMessage(a.id)?.sentAt ?? a.startedAt;
    const lastB = getLastMessage(b.id)?.sentAt ?? b.startedAt;
    return new Date(lastB).getTime() - new Date(lastA).getTime();
  });

  const lifetimeEarnings = allSessions.reduce((sum, s) => sum + getSessionEarnings(s).total, 0);
  const todaysEarnings = isCreator ? getTodaysEarningsForCreator(account.username) : 0;
  const expiringTodayCount = activeSessions.filter(isExpiringToday).length;

  const overviewMetrics = [
    { label: "Active chats", value: String(activeSessions.length), icon: MessagesSquare, accent: "neutral" as const },
    { label: "Pending media requests", value: String(pendingRequests.length), icon: Camera, accent: "neutral" as const },
    { label: "Today's earnings", value: `$${todaysEarnings.toFixed(2)}`, icon: DollarSign, accent: "neutral" as const },
    { label: "Expiring today", value: String(expiringTodayCount), icon: Timer, accent: "amber" as const },
  ];

  const openReportsCount = isCreator ? getReportsForCreator(account.username).length : 0;
  const pendingIssuesCount = isCreator ? getPaymentIssuesForCreator(account.username).length : 0;
  // Prototype has no multi-user backend, so this reflects only the current
  // local fan's block state — see CreatorTrustMetrics for the same caveat.
  const blockedUsersCount = isCreator ? getCreatorTrustMetrics(account.username).blocksReceived : 0;

  const trustMetrics = [
    { label: "Open Reports", value: String(openReportsCount), icon: FileWarning, accent: "neutral" as const },
    { label: "Pending Payment Issues", value: String(pendingIssuesCount), icon: Receipt, accent: "neutral" as const },
    { label: "Blocked Users", value: String(blockedUsersCount), icon: UserX, accent: "neutral" as const },
  ];

  function handleRequestResolved() {
    setVersion((v) => v + 1);
  }

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
            {(isCreator ? overviewMetrics : fanPlaceholderMetrics).map((metric) => (
              <DashboardCard key={metric.label} {...metric} />
            ))}
          </div>
          {isCreator && lifetimeEarnings === 0 && (
            <EmptyState
              icon={DollarSign}
              title="No earnings yet"
              description="Earnings will appear here once a fan unlocks 24-hour chat access or purchases live media."
            />
          )}
        </section>

        {isCreator && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Trust &amp; Safety</h2>
            <p className="text-xs text-text-muted">Informational only — reports and blocks aren't public.</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {trustMetrics.map((metric) => (
                <DashboardCard key={metric.label} {...metric} />
              ))}
            </div>
          </section>
        )}

        {isCreator && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Pending Media Requests</h2>
            {pendingRequests.length === 0 ? (
              <EmptyState
                icon={Camera}
                title="No media requests"
                description="Live photo and video requests from fans will show up here for you to fulfill."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {pendingRequests.map((purchase) => (
                  <MediaRequestCard key={purchase.id} purchase={purchase} onResolved={handleRequestResolved} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Active Conversations</h2>
            {isCreator && sortedActiveSessions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
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
                <CategoryPill
                  variant="neutral"
                  selected={sortMode === "spending"}
                  onClick={() => setSortMode("spending")}
                >
                  Highest spending
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
          ) : allSessions.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No conversations yet"
              description="Conversations will appear here once a fan unlocks 24-hour chat access with you."
            />
          ) : sortedActiveSessions.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No active chats"
              description="None of your conversations are active right now. Past conversations stay available to fans for renewal."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sortedActiveSessions.map((session) => {
                const lastMessage = getLastMessage(session.id);
                return (
                  <DashboardConversationRow
                    key={session.id}
                    session={session}
                    lastMessage={lastMessage}
                    unread={lastMessage?.senderRole === "fan"}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav activeHref="/dashboard" />
    </div>
  );
}
