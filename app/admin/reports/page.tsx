"use client";

import * as React from "react";
import { Loader2, Flag, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { canStaffRole } from "@/lib/admin/permissions";
import type { ModerationReportStatus } from "@/lib/supabase/database.types";

async function logAdminActionClient(action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("log_admin_action", {
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_metadata: metadata,
  });
  if (error) {
    // Audit logging is important but shouldn't block an otherwise-
    // successful admin action if it fails.
    console.error("[admin audit log] failed to record action:", action, error);
  }
}

interface AdminReportRow {
  id: string;
  reportType: string;
  reporterUsername: string | null;
  reportedUsername: string | null;
  reason: string;
  status: ModerationReportStatus;
  conversationId: string | null;
  paymentAttemptId: string | null;
  createdAt: string;
  notes: string | null;
}

/**
 * Sprint L11 §Admin: reuses the existing moderation_reports table
 * (Admin Portal) and RBAC/audit infrastructure — this is the one
 * moderation dashboard for reports, not a second one. Reporter identity
 * is shown here (staff legitimately need it to investigate) but never to
 * the reported party, which has no read access to this table at all
 * (see moderation_reports RLS).
 */
export default function AdminReportsPage() {
  const { toast } = useToast();
  const [rows, setRows] = React.useState<AdminReportRow[] | null>(null);
  const [filter, setFilter] = React.useState<ModerationReportStatus | "">("open");
  const [staffRole, setStaffRole] = React.useState<string | null>(null);
  const [notesDraft, setNotesDraft] = React.useState<Record<string, string>>({});
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setRows(null);
    const supabase = createSupabaseBrowserClient();
    let query = supabase.from("moderation_reports").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter) query = query.eq("status", filter);
    const { data, error } = await query;
    if (error || !data) {
      setRows([]);
      return;
    }

    const usernameCache = new Map<string, string>();
    async function usernameFor(id: string | null): Promise<string | null> {
      if (!id) return null;
      if (!usernameCache.has(id)) {
        const { data: profile } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle();
        usernameCache.set(id, profile?.username ?? id);
      }
      return usernameCache.get(id) ?? null;
    }

    const result: AdminReportRow[] = [];
    for (const row of data) {
      const reportedId = row.reported_user_id ?? row.reported_creator_id;
      const [reporterUsername, reportedUsername] = await Promise.all([
        usernameFor(row.reporter_id),
        usernameFor(reportedId),
      ]);
      result.push({
        id: row.id,
        reportType: row.report_type,
        reporterUsername,
        reportedUsername,
        reason: row.reason,
        status: row.status,
        conversationId: row.conversation_id,
        paymentAttemptId: row.payment_attempt_id,
        createdAt: row.created_at,
        notes: row.notes,
      });
    }
    setRows(result);
  }, [filter]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      setStaffRole(profile?.role ?? null);
    });
  }, []);

  const canTriage = staffRole ? canStaffRole(staffRole, "triageReports") : false;
  const canSuspend = staffRole ? canStaffRole(staffRole, "suspendUsers") : false;

  async function handleResolve(reportId: string, status: "resolved" | "dismissed") {
    setBusyId(reportId);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("moderation_reports")
        .update({ status, notes: notesDraft[reportId] ?? null, resolved_at: new Date().toISOString() })
        .eq("id", reportId);
      if (error) throw error;
      await logAdminActionClient(`report.${status}`, "moderation_report", reportId, { notes: notesDraft[reportId] });
      toast({ title: status === "resolved" ? "Report resolved" : "Report dismissed", variant: "success" });
      load();
    } catch (error) {
      toast({ title: "Action failed", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspend(reportedUsername: string) {
    setBusyId(reportedUsername);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: profile } = await supabase.from("profiles").select("id").eq("username", reportedUsername).maybeSingle();
      if (!profile) throw new Error("User not found.");
      const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", profile.id);
      if (error) throw error;
      await logAdminActionClient("user.suspended", "profile", profile.id, { via: "moderation_report" });
      toast({ title: `@${reportedUsername} suspended`, variant: "success" });
    } catch (error) {
      toast({ title: "Couldn't suspend", description: error instanceof Error ? error.message : undefined, variant: "danger" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-text-secondary">User, conversation, message, and media-request reports.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["open", "assigned", "resolved", "dismissed", ""] as const).map((status) => (
          <Button key={status || "all"} size="sm" variant={filter === status ? "primary" : "outline"} onClick={() => setFilter(status)}>
            {status || "All"}
          </Button>
        ))}
      </div>

      {rows === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" description="Nothing matches this filter." />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {row.reportType.replace("_", " ")}
                  {row.reportedUsername ? ` — @${row.reportedUsername}` : ""}
                </CardTitle>
                <span className="text-xs uppercase tracking-wide text-text-muted">{row.status}</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-text-primary">{row.reason}</p>
                <p className="text-xs text-text-muted">
                  Reported by @{row.reporterUsername ?? "unknown"} · {new Date(row.createdAt).toLocaleString()}
                  {row.conversationId ? ` · Conversation ${row.conversationId.slice(0, 8)}…` : ""}
                  {row.paymentAttemptId ? ` · Payment ${row.paymentAttemptId.slice(0, 8)}…` : ""}
                  {row.notes ? ` · Notes: ${row.notes}` : ""}
                </p>

                {canTriage && (row.status === "open" || row.status === "assigned") && (
                  <>
                    <Input
                      placeholder="Internal note (optional)"
                      value={notesDraft[row.id] ?? ""}
                      onChange={(e) => setNotesDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      className="max-w-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={busyId === row.id} onClick={() => handleResolve(row.id, "resolved")}>
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => handleResolve(row.id, "dismissed")}
                      >
                        Dismiss
                      </Button>
                      {canSuspend && row.reportedUsername && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger"
                          disabled={busyId === row.reportedUsername}
                          onClick={() => handleSuspend(row.reportedUsername!)}
                        >
                          <ShieldAlert className="mr-1 h-4 w-4" />
                          Suspend @{row.reportedUsername}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
