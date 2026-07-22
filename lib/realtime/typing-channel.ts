"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const TYPING_EVENT = "typing";
const TYPING_DEBOUNCE_MS = 2000; // stop automatically after this long without a keystroke
const TYPING_SEND_THROTTLE_MS = 2000; // never broadcast more than once per this interval

function channelName(conversationId: string): string {
  return `typing:${conversationId}`;
}

/** One channel per conversation, ephemeral broadcast only — nothing here
 * is ever written to the database (§7). */
export class TypingChannel {
  private channel: RealtimeChannel;
  private lastSentAt = 0;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly conversationId: string,
    private readonly selfUsername: string,
    onTyping: (username: string, isTyping: boolean) => void
  ) {
    this.channel = createSupabaseBrowserClient()
      .channel(channelName(conversationId), { config: { broadcast: { self: false } } })
      .on("broadcast", { event: TYPING_EVENT }, ({ payload }) => {
        // Never show the current user's own typing state (§7) — `self:
        // false` above already prevents receiving our own broadcasts, but
        // this is a second, explicit check in case that config ever
        // changes.
        if (payload?.username && payload.username !== this.selfUsername) {
          onTyping(payload.username, Boolean(payload.isTyping));
        }
      })
      .subscribe();
  }

  /** Call on every composer keystroke — internally throttled, so this is
   * cheap to call on every keystroke without spamming realtime events. */
  notifyTyping(): void {
    const now = Date.now();
    if (now - this.lastSentAt >= TYPING_SEND_THROTTLE_MS) {
      this.lastSentAt = now;
      this.broadcast(true);
    }
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => this.notifyStopped(), TYPING_DEBOUNCE_MS);
  }

  /** Call when the input is cleared, the message is submitted, or the
   * composer loses focus (§7). */
  notifyStopped(): void {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    this.lastSentAt = 0;
    this.broadcast(false);
  }

  private broadcast(isTyping: boolean): void {
    this.channel.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload: { username: this.selfUsername, isTyping },
    });
  }

  /** Call on disconnect/navigation away from the conversation (§7). */
  dispose(): void {
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.notifyStopped();
    createSupabaseBrowserClient().removeChannel(this.channel);
  }
}
