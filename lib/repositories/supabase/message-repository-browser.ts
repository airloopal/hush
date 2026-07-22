"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  queryGetMessages,
  querySendMessage,
  queryMarkConversationRead,
  queryGetLastReadState,
  queryGetUnreadCounts,
} from "@/lib/repositories/supabase/message-queries";
import { subscribeToConversationMessages } from "@/lib/realtime/message-channel";
import type { MessageRepository } from "@/lib/repositories/message-repository";

export const supabaseMessageRepositoryBrowser: MessageRepository = {
  async getMessages(conversationId, options) {
    return queryGetMessages(createSupabaseBrowserClient(), conversationId, options);
  },
  async sendMessage(conversationId, body, clientMessageId) {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated.");
    return querySendMessage(supabase, conversationId, user.id, body, clientMessageId);
  },
  subscribeToMessages(conversationId, callback) {
    return subscribeToConversationMessages(conversationId, callback);
  },
  async markConversationRead(conversationId, messageId) {
    await queryMarkConversationRead(createSupabaseBrowserClient(), conversationId, messageId);
  },
  async getUnreadCounts(userId) {
    return queryGetUnreadCounts(createSupabaseBrowserClient(), userId);
  },
  async getLastReadState(conversationId, userId) {
    return queryGetLastReadState(createSupabaseBrowserClient(), conversationId, userId);
  },
};
