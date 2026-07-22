import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationSummary, ConversationSessionSummary } from "@/lib/conversation-types";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

interface ConversationRow {
  id: string;
  creator_id: string;
  fan_id: string;
  latest_message_at: string | null;
  latest_message_preview: string | null;
  created_at: string;
}

async function usernameFor(supabase: Client, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data?.username ?? userId;
}

async function toSummary(supabase: Client, row: ConversationRow): Promise<ConversationSummary> {
  const [creatorUsername, fanUsername] = await Promise.all([
    usernameFor(supabase, row.creator_id),
    usernameFor(supabase, row.fan_id),
  ]);
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorUsername,
    fanId: row.fan_id,
    fanUsername,
    latestMessageAt: row.latest_message_at,
    latestMessagePreview: row.latest_message_preview,
    createdAt: row.created_at,
  };
}

export async function queryCreateConversation(
  supabase: Client,
  fanId: string,
  creatorId: string
): Promise<ConversationSummary> {
  const existing = await queryConversationByUsers(supabase, fanId, creatorId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ fan_id: fanId, creator_id: creatorId })
    .select("*")
    .single();
  if (error) throw error;
  return toSummary(supabase, data);
}

export async function queryConversation(supabase: Client, conversationId: string): Promise<ConversationSummary | null> {
  const { data, error } = await supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle();
  if (error) throw error;
  return data ? toSummary(supabase, data) : null;
}

export async function queryConversationByUsers(
  supabase: Client,
  fanId: string,
  creatorId: string
): Promise<ConversationSummary | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("fan_id", fanId)
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (error) throw error;
  return data ? toSummary(supabase, data) : null;
}

export async function queryUserConversations(
  supabase: Client,
  userId: string,
  role: "fan" | "creator"
): Promise<ConversationSummary[]> {
  const column = role === "fan" ? "fan_id" : "creator_id";
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq(column, userId)
    .order("latest_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map((row) => toSummary(supabase, row)));
}

export async function updateLatestMessage(
  supabase: Client,
  conversationId: string,
  preview: string,
  at: string = new Date().toISOString()
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ latest_message_preview: preview, latest_message_at: at })
    .eq("id", conversationId);
  if (error) throw error;
}

// --- Sessions ---------------------------------------------------------

function toSessionSummary(row: {
  id: string;
  conversation_id: string;
  activated_at: string;
  expires_at: string;
  status: string;
}): ConversationSessionSummary {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    status: row.status as ConversationSessionSummary["status"],
  };
}

export async function queryCreateSession(
  supabase: Client,
  conversationId: string,
  durationHours: number
): Promise<ConversationSessionSummary> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("conversation_sessions")
    .insert({
      conversation_id: conversationId,
      status: "active",
      activated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return toSessionSummary(data);
}

export async function queryExpireSessions(supabase: Client, conversationId: string): Promise<void> {
  const { error } = await supabase.rpc("expire_conversation_sessions", { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function queryActiveSession(
  supabase: Client,
  conversationId: string
): Promise<ConversationSessionSummary | null> {
  await queryExpireSessions(supabase, conversationId);
  const { data, error } = await supabase
    .from("conversation_sessions")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Defensive re-check even after the sweep — see
  // ConversationSessionService.isActive for why this is never trusted on
  // stored status alone.
  return new Date(data.expires_at).getTime() > Date.now() ? toSessionSummary(data) : null;
}

export async function querySessionRemaining(supabase: Client, conversationId: string): Promise<number> {
  const active = await queryActiveSession(supabase, conversationId);
  if (!active) return 0;
  return Math.max(0, new Date(active.expiresAt).getTime() - Date.now());
}
