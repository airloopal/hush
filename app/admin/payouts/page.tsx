"use client";

import * as React from "react";
import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { canStaffRole } from "@/lib/admin/permissions";
import {
  getAllPayoutRequests,
  getLedgerEntriesForCreator,
  approvePayout,
  rejectPayout,
  markPayoutProcessing,
  markPayoutPaid,
  type AdminPayoutRow,
} from "@/lib/finance/admin-client";
import type { LedgerEntry, PayoutRequestStatus } from "@/lib/finance-types";
import { formatMinorUnits } from "@/lib/money";

const ENTRY_TYPE_LABEL: Record<string, string> = {
  chat_earning: "Chat day pass",
  platform_commission: "Platform commission",
  refund: "Refund",
  reversal: "Reversal",
  payout_deduction: "Payout",
  manual_adjustment: "Adjustment",
};

/**
 * §8 of the original Admin Portal brief, satisfied minimally and
 * specifically for what this sprint's payout system needs — not a
 * duplicate of a fuller admin portal, since none exists yet to duplicate.
 * The actual authorization boundary is server-side (RLS + the
 * is_privileged_staff() check inside each RPC — see migration
 * 20260701000031); canStaffRole() below only ever decides which buttons
 * to *show*, never whether an action succeeds.
 */
export default function AdminPayoutsPage() {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<AdminPayoutRow[] | null>(null);
  const [filter, setFilter] = React.useState<PayoutRequestStatus | "">("pending");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [staffRole, setStaffRole] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [ledgerByCreator, setLedgerByCreator] = React.useState<Record<string, LedgerEntry[] | "loading">>({});

  const load = React.useCallback(() => {
    setRows(null);
    getAllPayoutRequests(filter || undefined)
      .then(setRows)
      .catch(() => setRows([]));
  }, [filter]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    import("@/lib/supabase/client").then(({ createSupabaseBrowserClient }) => {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
        setStaffRole(profile?.role ?? null);
      });
    });
  }, []);

  async function handleAction(action: () => Promise<void>, payoutId: string) {
    setBusyId(payoutId);
    try {
      await action();
      toast({ title: "Done", variant: "success" });
      load();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      });
    } finally {
      setBusyId(null);
    }
  }

  function toggleLedger(row: AdminPayoutRow) {
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(row.id);
    if (!ledgerByCreator[row.creatorId]) {
      setLedgerByCreator((prev) => ({ ...prev, [row.creatorId]: "loading" }));
      getLedgerEntriesForCreator(row.creatorId)
        .then((entries) => setLedgerByCreator((prev) => ({ ...prev, [row.creatorId]: entries })))
        .catch(() => setLedgerByCreator((prev) => ({ ...prev, [row.creatorId]: [] })));
    }
  }

  const canDecide = staffRole ? canStaffRole(staffRole, "decidePayouts") : false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payout requests</h1>
        <p className="text-sm text-text-secondary">Review and action creator payout requests.</p>
      </div>

      <div className="flex gap-2">
        {(["pending", "approved", "processing", "paid", "rejected", "cancelled", ""] as const).map((status) => (
          <Button
            key={status || "all"}
            size="sm"
            variant={filter === status ? "primary" : "outline"}
            onClick={() => setFilter(status)}
          >
            {status || "All"}
          </Button>
        ))}
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Clock} title="No payout requests" description="Nothing matches this filter right now." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  @{row.creatorUsername ?? row.creatorId} — {formatMinorUnits(row.amountMinor, row.currency)}
                </CardTitle>
                <span className="text-xs uppercase tracking-wide text-text-muted">{row.status}</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-text-muted">
                  Requested {new Date(row.requestedAt).toLocaleString()}
                  {row.adminNotes ? ` · Notes: ${row.adminNotes}` : ""}
                </p>

                {canDecide && (
                  <Input
                    placeholder="Internal note (optional)"
                    value={notesDraft[row.id] ?? ""}
                    onChange={(e) => setNotesDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    className="max-w-sm"
                  />
                )}

                {canDecide && (
                  <div className="flex flex-wrap gap-2">
                    {row.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          disabled={busyId === row.id}
                          onClick={() => handleAction(() => approvePayout(row.id, notesDraft[row.id]), row.id)}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() =>
                            handleAction(() => rejectPayout(row.id, notesDraft[row.id] || "Rejected by admin"), row.id)
                          }
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                    {row.status === "approved" && (
                      <Button
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => handleAction(() => markPayoutProcessing(row.id), row.id)}
                      >
                        Mark processing
                      </Button>
                    )}
                    {(row.status === "approved" || row.status === "processing") && (
                      <Button
                        size="sm"
                        disabled={busyId === row.id}
                        onClick={() => handleAction(() => markPayoutPaid(row.id, notesDraft[row.id] || "Sent manually"), row.id)}
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-fit" onClick={() => toggleLedger(row)}>
                  {expandedId === row.id ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                  {expandedId === row.id ? "Hide" : "View"} related ledger entries
                </Button>

                {expandedId === row.id && (
                  <div className="flex flex-col gap-1.5 rounded-md border border-border bg-surface-muted/40 p-3">
                    {ledgerByCreator[row.creatorId] === "loading" || !ledgerByCreator[row.creatorId] ? (
                      <span className="text-xs text-text-muted">Loading…</span>
                    ) : (ledgerByCreator[row.creatorId] as LedgerEntry[]).length === 0 ? (
                      <span className="text-xs text-text-muted">No ledger entries for this creator.</span>
                    ) : (
                      (ledgerByCreator[row.creatorId] as LedgerEntry[]).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">
                            {ENTRY_TYPE_LABEL[entry.entryType] ?? entry.entryType} ·{" "}
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                          <span className={entry.creatorNetMinor < 0 ? "text-danger" : "text-emerald"}>
                            {formatMinorUnits(entry.creatorNetMinor, entry.currency)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
