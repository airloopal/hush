"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { MessageSummary } from "@/lib/message-types";
import type { Database } from "@/lib/supabase/database.types";

// One channel per conversation, never a global "all messages" channel —
// scoped and predictable, and trivially unique per chat so switching
// conversations can't cross-deliver into the wrong thread.
function channelName(conversationId: string): string {
  return `messages:${conversationId}`;
}

// Tracks in-flight channels so a second subscribe() call for the same
// conversation (e.g. a fast-navigating user, or a component remounting
// before its cleanup ran) reuses the existing channel instead of opening
// a duplicate — see docs/realtime-messaging.md "Realtime subscription
// model".
const activeChannels = new Map<string, { channel: RealtimeChannel; listeners: Set<(m: MessageSummary) => void> }>();

function toSummary(row: Database["public"]["Tables"]["messages"]["Row"], senderUsername: string): MessageSummary {
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

/**
 * Subscribes to new messages in exactly one conversation. Returns an
 * unsubscribe function. Safe to call more than once for the same
 * conversation — subsequent calls attach an additional listener to the
 * same underlying channel rather than opening a new socket subscription;
 * the channel itself is only closed once every listener has unsubscribed.
 */
export function subscribeToConversationMessages(
  conversationId: string,
  callback: (message: MessageSummary) => void
): () => void {
  const name = channelName(conversationId);
  let entry = activeChannels.get(name);

  if (!entry) {
    const supabase = createSupabaseBrowserClient();
    const listeners = new Set<(m: MessageSummary) => void>();
    const channel = supabase
      .channel(name)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const row = payload.new as Database["public"]["Tables"]["messages"]["Row"];
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", row.sender_id).maybeSingle();
          const message = toSummary(row, profile?.username ?? row.sender_id);
          listeners.forEach((listener) => listener(message));
        }
      )
      .subscribe();
    entry = { channel, listeners };
    activeChannels.set(name, entry);
  }

  entry.listeners.add(callback);

  return () => {
    const current = activeChannels.get(name);
    if (!current) return;
    current.listeners.delete(callback);
    if (current.listeners.size === 0) {
      createSupabaseBrowserClient().removeChannel(current.channel);
      activeChannels.delete(name);
    }
  };
}

/** True if the browser client's realtime socket is currently connected —
 * used to drive the compact "Reconnecting…" indicator rather than
 * blocking the page. */
export function isRealtimeConnected(): boolean {
  return createSupabaseBrowserClient().realtime.isConnected();
}

/** Subscribes to the browser client's global connection state, for a
 * "Reconnecting…" indicator. Returns an unsubscribe function. */
export function subscribeToRealtimeConnectionState(callback: (connected: boolean) => void): () => void {
  const supabase = createSupabaseBrowserClient();
  const handle = () => callback(supabase.realtime.isConnected());
  // Supabase's realtime client doesn't expose a typed connection-state
  // event emitter across versions in a stable way — poll lightly instead.
  // This is deliberately cheap (no network call, just a local flag read)
  // and only used to drive a small UI affordance, not correctness.
  const interval = setInterval(handle, 2000);
  handle();
  return () => clearInterval(interval);
}
