"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ModerationReportType } from "@/lib/supabase/database.types";

export interface SubmitReportParams {
  reportType: ModerationReportType;
  reason: string;
  reportedUserId?: string;
  reportedCreatorId?: string;
  conversationId?: string;
  paymentAttemptId?: string;
}

/** Submits a report into the existing admin moderation queue
 * (moderation_reports — see migration 20260701000036_blocking_and_reporting.sql
 * for the insert policy this relies on). reporter_id is always the
 * caller; the reported party is never told who reported them — RLS gives
 * them no visibility into this table at all. */
export async function submitReport(params: SubmitReportParams): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("moderation_reports").insert({
    report_type: params.reportType,
    reporter_id: user.id,
    reported_user_id: params.reportedUserId ?? null,
    reported_creator_id: params.reportedCreatorId ?? null,
    conversation_id: params.conversationId ?? null,
    payment_attempt_id: params.paymentAttemptId ?? null,
    reason: params.reason,
  });
  if (error) throw error;
}
