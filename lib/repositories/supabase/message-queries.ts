import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageSummary, UnreadCount, LastReadState } from "@/lib/message-types";
import type { GetMessagesOptions } from "@/lib/repositories/message-repository";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const DEFAULT_PAGE_SIZE = 30;

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  message_type: string;
  client_message_id: string | null;
  created_at: string;
}

async function usernameFor(supabase: Client, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  return data?.username ?? userId;
}

function toSummary(row: MessageRow, senderUsername: string): MessageSummary {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderUsername,
    body: row.body,
    messageType: "text",
    clientMessageId: row.client_message_id,
    createdAt: row.created_at,
  };
}

/** Oldest-to-newest within the returned page. `cursor` paginates
 * backwards (older messages) from a given createdAt. */
export async function queryGetMessages(
  supabase: Client,
  conversationId: string,
  options: GetMessagesOptions = {}
): Promise<MessageSummary[]> {
  const limit = options.limit ?? DEFAULT_PAGE_SIZE;
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).slice().reverse(); // newest-first fetch -> oldest-first render
  const usernames = new Map<string, string>();
  const results: MessageSummary[] = [];
  for (const row of rows) {
    if (!usernames.has(row.sender_id)) {
      usernames.set(row.sender_id, await usernameFor(supabase, row.sender_id));
    }
    results.push(toSummary(row, usernames.get(row.sender_id)!));
  }
  return results;
}

export async function querySendMessage(
  supabase: Client,
  conversationId: string,
  senderId: string,
  body: string,
  clientMessageId: string
): Promise<MessageSummary> {
  // Idempotent retry: if this (sender, clientMessageId) already persisted
  // (e.g. the first attempt actually succeeded but the client never saw
  // the response), return the existing row instead of erroring.
  const { data: existing } = await supabase
    .from("messages")
    .select("*")
    .eq("sender_id", senderId)
    .eq("client_message_id", clientMessageId)
    .maybeSingle();
  if (existing) {
    return toSummary(existing, await usernameFor(supabase, existing.sender_id));
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body, client_message_id: clientMessageId })
    .select("*")
    .single();
  if (error) throw error;
  return toSummary(data, await usernameFor(supabase, data.sender_id));
}

export async function queryMarkConversationRead(
  supabase: Client,
  conversationId: string,
  messageId?: string
): Promise<void> {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_message_id: messageId ?? null,
  });
  if (error) throw error;
}

export async function queryGetLastReadState(
  supabase: Client,
  conversationId: string,
  userId: string
): Promise<LastReadState | null> {
  const { data, error } = await supabase
    .from("conversation_reads")
    .select("last_read_message_id, last_read_at")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { lastReadMessageId: data.last_read_message_id, lastReadAt: data.last_read_at };
}

/** Unread = messages in each of the caller's conversations, sent by the
 * OTHER participant, newer than the caller's own last_read_at (or all of
 * them, if they've never read that conversation). One query per
 * conversation the user is in, not one per message. */
export async function queryGetUnreadCounts(supabase: Client, userId: string): Promise<UnreadCount[]> {
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("id")
    .or(`fan_id.eq.${userId},creator_id.eq.${userId}`);
  if (convError) throw convError;
  if (!conversations || conversations.length === 0) return [];

  const { data: reads, error: readsError } = await supabase
    .from("conversation_reads")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  if (readsError) throw readsError;
  const lastReadByConversation = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at]));

  const counts = await Promise.all(
    conversations.map(async (c) => {
      const lastReadAt = lastReadByConversation.get(c.id);
      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .neq("sender_id", userId);
      if (lastReadAt) query = query.gt("created_at", lastReadAt);
      const { count, error } = await query;
      if (error) throw error;
      return { conversationId: c.id, count: count ?? 0 };
    })
  );

  return counts.filter((c) => c.count > 0);
}
