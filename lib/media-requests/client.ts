"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MediaRequest, MediaRequestType } from "@/lib/media-request-types";
import type { Database } from "@/lib/supabase/database.types";

type Row = Database["public"]["Tables"]["media_requests"]["Row"];

function toMediaRequest(row: Row): MediaRequest {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    fanId: row.fan_id,
    creatorId: row.creator_id,
    requestType: row.request_type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    status: row.status,
    paymentAttemptId: row.payment_attempt_id,
    hasMedia: Boolean(row.storage_path),
    requestedAt: row.requested_at,
    respondedAt: row.responded_at,
    fulfilledAt: row.fulfilled_at,
    expiresAt: row.expires_at,
    declineReason: row.decline_reason,
  };
}

export async function requestMedia(
  conversationId: string,
  requestType: MediaRequestType
): Promise<{ checkoutUrl: string; paymentId: string }> {
  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-idempotency-key": crypto.randomUUID() },
    body: JSON.stringify({ conversationId, mediaRequestType: requestType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Couldn't start checkout.");
  return data;
}

export async function getMediaRequestsForConversation(conversationId: string): Promise<MediaRequest[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("media_requests")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toMediaRequest);
}

export async function getPendingMediaRequestsForCreator(): Promise<MediaRequest[]> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("media_requests")
    .select("*")
    .eq("creator_id", user.id)
    .in("status", ["pending_creator", "accepted"])
    .order("requested_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toMediaRequest);
}

export async function acceptMediaRequest(mediaRequestId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("accept_media_request", { p_media_request_id: mediaRequestId });
  if (error) throw error;
}

export async function declineMediaRequest(mediaRequestId: string, reason?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("decline_media_request", {
    p_media_request_id: mediaRequestId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function fulfilMediaRequest(mediaRequestId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/media-requests/${mediaRequestId}/fulfil`, { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Couldn't fulfil this request.");
}

export async function getMediaSignedUrl(mediaRequestId: string): Promise<string> {
  const res = await fetch(`/api/media-requests/${mediaRequestId}/signed-url`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? "Couldn't access this media.");
  return data.url;
}
