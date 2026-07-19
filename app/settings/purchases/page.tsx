"use client";

import * as React from "react";
import { Camera, MessageCircle, Receipt, Video } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardCard } from "@/components/dashboard-card";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { useRequireAccount } from "@/lib/use-account-guard";
import { getPurchaseHistoryForFan, groupPurchasesByMonth, summarizePurchases } from "@/lib/purchases";
import type { PurchaseRecord } from "@/lib/purchases";

const TYPE_ICON = { chat: MessageCircle, photo: Camera, video: Video } as const;
const TYPE_LABEL = { chat: "24-hour chat", photo: "Live photo", video: "Live video" } as const;

export default function PurchaseHistoryPage() {
  const { ready, account } = useRequireAccount();
  const [records, setRecords] = React.useState<PurchaseRecord[] | null>(null);

  React.useEffect(() => {
    if (!ready || !account || account.role !== "fan") return;
    setRecords(getPurchaseHistoryForFan(account.username));
  }, [ready, account]);

  if (!ready || !account) return null;

  if (account.role !== "fan") {
    return (
      <Shell username={account.username}>
        <EmptyState
          icon={Receipt}
          title="Purchases are tracked on the fan side"
          description="Creator earnings live on your dashboard instead."
        />
      </Shell>
    );
  }

  const summary = records ? summarizePurchases(records) : null;
  const groups = records ? groupPurchasesByMonth(records) : [];

  return (
    <Shell username={account.username}>
      <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard label="Total spent" value={`$${summary.totalSpent.toFixed(2)}`} icon={Receipt} accent="neutral" />
          <DashboardCard label="Chats unlocked" value={String(summary.chats)} icon={MessageCircle} accent="neutral" />
          <DashboardCard label="Photos purchased" value={String(summary.photos)} icon={Camera} accent="neutral" />
          <DashboardCard label="Videos purchased" value={String(summary.videos)} icon={Video} accent="neutral" />
        </div>
      )}

      {!records || records.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No purchases yet"
          description="Chat unlocks and live media purchases will show up here once you make one."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-text-secondary">{group.label}</h2>
              <div className="flex flex-col gap-2">
                {group.records.map((record) => {
                  const Icon = TYPE_ICON[record.type];
                  return (
                    <Card key={record.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-muted text-text-muted">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {TYPE_LABEL[record.type]} · @{record.creatorUsername}
                            </span>
                            <span className="text-xs text-text-muted">
                              {new Date(record.date).toLocaleDateString()} · {record.status} ·{" "}
                              <span className="font-mono-data">{record.transactionRef}</span>
                            </span>
                          </div>
                        </div>
                        <span className="font-mono-data text-sm font-semibold">${record.amount.toFixed(2)}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ username, children }: { username: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/settings" user={{ name: username }} />
      <main className="container flex max-w-2xl flex-col gap-6 py-10">{children}</main>
      <BottomNav activeHref="/settings" />
    </div>
  );
}
