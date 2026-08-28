"use client";

import * as React from "react";
import { AlertTriangle, Banknote, Clock, Loader2, TrendingUp, Wallet } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DashboardCard } from "@/components/dashboard-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useRequireRole } from "@/lib/use-account-guard";
import { isDemoMode } from "@/lib/auth/mode";
import { formatMinorUnits } from "@/lib/money";
import {
  getMyBalance,
  getMyLedgerEntries,
  getMyPayoutRequests,
  getMinimumPayout,
  requestPayout,
  cancelPayoutRequest,
} from "@/lib/finance/client";
import type { CreatorBalance, LedgerEntry, PayoutRequest } from "@/lib/finance-types";

const ENTRY_TYPE_LABEL: Record<string, string> = {
  chat_earning: "Chat day pass",
  platform_commission: "Platform commission",
  refund: "Refund",
  reversal: "Reversal",
  payout_deduction: "Payout",
  manual_adjustment: "Adjustment",
};

export default function CreatorEarningsPage() {
  const { ready, account } = useRequireRole("creator");
  const { toast } = useToast();
  const demoMode = isDemoMode();

  const [balance, setBalance] = React.useState<CreatorBalance | null | undefined>(undefined);
  const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
  const [payouts, setPayouts] = React.useState<PayoutRequest[]>([]);
  const [minimum, setMinimum] = React.useState({ amountMinor: 5000, currency: "USD" });
  const [requesting, setRequesting] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);

  const load = React.useCallback(() => {
    Promise.all([getMyBalance(), getMyLedgerEntries(), getMyPayoutRequests(), getMinimumPayout()])
      .then(([b, e, p, m]) => {
        setBalance(b);
        setEntries(e);
        setPayouts(p);
        setMinimum(m);
      })
      .catch(() => setLoadError(true));
  }, []);

  React.useEffect(() => {
    if (!ready || !account || demoMode) return;
    load();
  }, [ready, account, demoMode, load]);

  if (!ready || !account) return null;

  async function handleRequestPayout() {
    if (!balance) return;
    setRequesting(true);
    try {
      await requestPayout(balance.availableBalanceMinor, balance.currency);
      toast({ title: "Payout requested", description: "An admin will review it shortly.", variant: "success" });
      load();
    } catch (error) {
      toast({
        title: "Couldn't request payout",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      });
    } finally {
      setRequesting(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelPayoutRequest(id);
      toast({ title: "Payout request cancelled", variant: "success" });
      load();
    } catch (error) {
      toast({ title: "Couldn't cancel", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/dashboard" user={{ name: account.username }} />
      <main className="container flex max-w-3xl flex-col gap-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Earnings</h1>

        {demoMode ? (
          <EmptyState
            icon={Wallet}
            title="Earnings tracking is a production-mode feature"
            description="Connect Supabase to see real balances and payout requests. Demo mode doesn't track a real ledger."
          />
        ) : loadError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load your earnings"
            description="Something went wrong reaching the server. Check your connection and try again."
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        ) : balance === undefined ? (
          <div className="flex items-center justify-center gap-2 py-16 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DashboardCard
                icon={Wallet}
                label="Available"
                value={formatMinorUnits(balance?.availableBalanceMinor ?? 0, balance?.currency ?? "USD")}
              />
              <DashboardCard
                icon={Clock}
                label="Pending"
                value={formatMinorUnits(balance?.pendingBalanceMinor ?? 0, balance?.currency ?? "USD")}
              />
              <DashboardCard
                icon={TrendingUp}
                label="Lifetime earnings"
                value={formatMinorUnits(balance?.lifetimeCreatorEarningsMinor ?? 0, balance?.currency ?? "USD")}
              />
              <DashboardCard
                icon={Banknote}
                label="Paid out"
                value={formatMinorUnits(balance?.paidOutMinor ?? 0, balance?.currency ?? "USD")}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Request a payout</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-text-secondary">
                  Minimum payout: {formatMinorUnits(minimum.amountMinor, minimum.currency)}. Pending funds settle
                  automatically and become available for payout after a short hold period.
                </p>
                <Button
                  disabled={requesting || !balance || balance.availableBalanceMinor < minimum.amountMinor}
                  onClick={handleRequestPayout}
                  className="w-fit"
                >
                  {requesting ? "Requesting…" : `Request payout of ${formatMinorUnits(balance?.availableBalanceMinor ?? 0, balance?.currency ?? "USD")}`}
                </Button>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary">Payout history</h2>
              {payouts.length === 0 ? (
                <EmptyState icon={Banknote} title="No payout requests yet" />
              ) : (
                payouts.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium">{formatMinorUnits(p.amountMinor, p.currency)}</p>
                        <p className="text-xs text-text-muted">
                          Requested {new Date(p.requestedAt).toLocaleDateString()} · {p.status}
                        </p>
                      </div>
                      {p.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(p.id)}>
                          Cancel
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-primary">Recent earnings</h2>
              {entries.length === 0 ? (
                <EmptyState icon={TrendingUp} title="No earnings yet" description="Completed chat unlocks will show up here." />
              ) : (
                entries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                    <span>{ENTRY_TYPE_LABEL[e.entryType] ?? e.entryType}</span>
                    <span className={e.creatorNetMinor < 0 ? "text-danger" : "text-emerald"}>
                      {formatMinorUnits(e.creatorNetMinor, e.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
      <BottomNav activeHref="/dashboard" />
    </div>
  );
}
