"use client";

import * as React from "react";
import { Loader2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatMinorUnits } from "@/lib/money";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MediaRequestStatus } from "@/lib/media-request-types";

interface AdminMediaRequestRow {
  id: string;
  requestType: string;
  amountMinor: number;
  currency: string;
  status: MediaRequestStatus;
  fanUsername: string;
  creatorUsername: string;
  paymentStatus: string | null;
  requestedAt: string;
  fulfilledAt: string | null;
  expiresAt: string | null;
  declineReason: string | null;
  ledgerEntries: Array<{ id: string; entryType: string; creatorNetMinor: number; createdAt: string }>;
}

/**
 * §Admin: "Extend the existing Admin Portal to inspect media requests,
 * payment status, fulfilment, expiry/refund status and related ledger
 * entries." Reuses the existing /admin layout (RBAC + audit log
 * infrastructure already enforced there) — no new admin shell.
 */
export default function AdminMediaRequestsPage() {
  const [rows, setRows] = React.useState<AdminMediaRequestRow[] | null>(null);
  const [filter, setFilter] = React.useState<MediaRequestStatus | "">("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setRows(null);
    const supabase = createSupabaseBrowserClient();
    let query = supabase.from("media_requests").select("*").order("requested_at", { ascending: false }).limit(100);
    if (filter) query = query.eq("status", filter);
    const { data, error } = await query;
    if (error || !data) {
      setRows([]);
      return;
    }

    const usernameCache = new Map<string, string>();
    async function usernameFor(id: string): Promise<string> {
      if (!usernameCache.has(id)) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle();
        usernameCache.set(id, profile?.username ?? id);
      }
      return usernameCache.get(id)!;
    }

    const result: AdminMediaRequestRow[] = [];
    for (const row of data) {
      const [fanUsername, creatorUsername] = await Promise.all([usernameFor(row.fan_id), usernameFor(row.creator_id)]);
      let paymentStatus: string | null = null;
      if (row.payment_attempt_id) {
        const { data: payment } = await supabase
          .from("payment_attempts")
          .select("internal_status")
          .eq("id", row.payment_attempt_id)
          .maybeSingle();
        paymentStatus = payment?.internal_status ?? null;
      }
      const { data: ledgerRows } = await supabase
        .from("creator_ledger_entries")
        .select("id, entry_type, creator_net_minor, created_at")
        .eq("source_payment_id", row.payment_attempt_id ?? "");
      result.push({
        id: row.id,
        requestType: row.request_type,
        amountMinor: row.amount_minor,
        currency: row.currency,
        status: row.status,
        fanUsername,
        creatorUsername,
        paymentStatus,
        requestedAt: row.requested_at,
        fulfilledAt: row.fulfilled_at,
        expiresAt: row.expires_at,
        declineReason: row.decline_reason,
        ledgerEntries: (ledgerRows ?? []).map((l) => ({
          id: l.id,
          entryType: l.entry_type,
          creatorNetMinor: l.creator_net_minor,
          createdAt: l.created_at,
        })),
      });
    }
    setRows(result);
  }, [filter]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media requests</h1>
        <p className="text-sm text-text-secondary">
          Live photo/video requests, payment status, fulfilment, and related ledger entries.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["", "pending_payment", "pending_creator", "accepted", "fulfilled", "declined", "expired", "refund_required"] as const).map(
          (status) => (
            <Button key={status || "all"} size="sm" variant={filter === status ? "primary" : "outline"} onClick={() => setFilter(status)}>
              {status || "All"}
            </Button>
          )
        )}
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Clock} title="No media requests" description="Nothing matches this filter." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {row.requestType === "live_photo" ? "Live Photo" : "Live Video"} — @{row.fanUsername} → @{row.creatorUsername} —{" "}
                  {formatMinorUnits(row.amountMinor, row.currency)}
                </CardTitle>
                <span className="text-xs uppercase tracking-wide text-text-muted">{row.status}</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-text-muted">
                  Requested {new Date(row.requestedAt).toLocaleString()}
                  {row.paymentStatus ? ` · Payment: ${row.paymentStatus}` : ""}
                  {row.fulfilledAt ? ` · Fulfilled ${new Date(row.fulfilledAt).toLocaleString()}` : ""}
                  {row.expiresAt ? ` · Expires ${new Date(row.expiresAt).toLocaleString()}` : ""}
                  {row.declineReason ? ` · Reason: ${row.declineReason}` : ""}
                </p>
                <Button variant="outline" size="sm" className="w-fit" onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}>
                  {expandedId === row.id ? "Hide" : "View"} related ledger entries ({row.ledgerEntries.length})
                </Button>
                {expandedId === row.id && (
                  <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-muted/40 p-3">
                    {row.ledgerEntries.length === 0 ? (
                      <span className="text-xs text-text-muted">No ledger entries yet.</span>
                    ) : (
                      row.ledgerEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">
                            {entry.entryType} · {new Date(entry.createdAt).toLocaleString()}
                          </span>
                          <span className={entry.creatorNetMinor < 0 ? "text-danger" : "text-emerald"}>
                            {formatMinorUnits(entry.creatorNetMinor, row.currency)}
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
