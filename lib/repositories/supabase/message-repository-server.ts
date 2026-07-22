import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  queryGetMessages,
  querySendMessage,
  queryMarkConversationRead,
  queryGetLastReadState,
  queryGetUnreadCounts,
} from "@/lib/repositories/supabase/message-queries";
import type { MessageRepository } from "@/lib/repositories/message-repository";

export const supabaseMessageRepository: MessageRepository = {
  async getMessages(conversationId, options) {
    const supabase = await createSupabaseServerClient();
    return queryGetMessages(supabase, conversationId, options);
  },
  async sendMessage(conversationId, body, clientMessageId) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated.");
    return querySendMessage(supabase, conversationId, user.id, body, clientMessageId);
  },
  subscribeToMessages() {
    throw new Error(
      "subscribeToMessages requires a browser client — use getClientMessageRepository() from a Client Component."
    );
  },
  async markConversationRead(conversationId, messageId) {
    const supabase = await createSupabaseServerClient();
    await queryMarkConversationRead(supabase, conversationId, messageId);
  },
  async getUnreadCounts(userId) {
    const supabase = await createSupabaseServerClient();
    return queryGetUnreadCounts(supabase, userId);
  },
  async getLastReadState(conversationId, userId) {
    const supabase = await createSupabaseServerClient();
    return queryGetLastReadState(supabase, conversationId, userId);
  },
};
