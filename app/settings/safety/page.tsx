"use client";

import * as React from "react";
import { FileWarning, Receipt, ShieldOff, UserX } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/use-toast";
import { useRequireAccount } from "@/lib/use-account-guard";
import { getBlockedCreatorsList, unblockCreator } from "@/lib/chat";
import { getPaymentIssuesForFan, getReportsForFan } from "@/lib/trust";
import { PAYMENT_ISSUE_TYPES, REPORT_REASONS } from "@/lib/trust-types";
import type { BlockedCreator, PaymentIssue, Report } from "@/lib/trust-types";

export default function SafetyCentrePage() {
  const { ready, account } = useRequireAccount();
  const { toast } = useToast();

  const [blocked, setBlocked] = React.useState<BlockedCreator[]>([]);
  const [reports, setReports] = React.useState<Report[]>([]);
  const [issues, setIssues] = React.useState<PaymentIssue[]>([]);

  React.useEffect(() => {
    if (!ready || !account || account.role !== "fan") return;
    setBlocked(getBlockedCreatorsList());
    setReports(getReportsForFan(account.username));
    setIssues(getPaymentIssuesForFan(account.username));
  }, [ready, account]);

  if (!ready || !account) return null;

  function handleUnblock(creatorUsername: string) {
    unblockCreator(creatorUsername);
    setBlocked(getBlockedCreatorsList());
    toast({
      title: "Creator unblocked",
      description: `@${creatorUsername} can message you again, and you can unlock chat with them.`,
      variant: "success",
    });
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/settings" user={{ name: account.username }} />

      <main className="container flex max-w-2xl flex-col gap-8 py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Safety Centre</h1>
          <p className="text-sm text-text-muted">Prototype data stored locally.</p>
        </div>

        {account.role !== "fan" ? (
          <EmptyState
            icon={ShieldOff}
            title="Safety Centre is for fan accounts"
            description="Blocking, reporting, and payment issues are tracked from the fan side of Hush."
          />
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Blocked Creators</h2>
              {blocked.length === 0 ? (
                <EmptyState
                  icon={UserX}
                  title="No blocked creators"
                  description="Creators you block from a conversation's safety menu will appear here."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {blocked.map((entry) => (
                    <Card key={entry.creatorUsername}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="flex flex-col">
                          <span className="font-medium">@{entry.creatorUsername}</span>
                          <span className="text-xs text-text-muted">
                            Blocked {new Date(entry.blockedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleUnblock(entry.creatorUsername)}>
                          Unblock
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Reports</h2>
              {reports.length === 0 ? (
                <EmptyState
                  icon={FileWarning}
                  title="No reports filed"
                  description="Conversations you report from the safety menu will be listed here."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {reports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {REPORT_REASONS.find((r) => r.value === report.reason)?.label ?? report.reason}
                          </span>
                          <span className="text-xs text-text-muted">
                            @{report.creatorUsername} · {new Date(report.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <StatusBadge status="pending" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Payment Issues</h2>
              {issues.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No payment issues reported"
                  description="Issues you report from a conversation's safety menu will show up here."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {issues.map((issue) => (
                    <Card key={issue.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {PAYMENT_ISSUE_TYPES.find((t) => t.value === issue.type)?.label ?? issue.type}
                          </span>
                          <span className="font-mono-data text-xs text-text-muted">
                            {issue.id} · {new Date(issue.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <StatusBadge status="pending" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav activeHref="/settings" />
    </div>
  );
}
