import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  queryCreateConversation,
  queryConversation,
  queryConversationByUsers,
  queryUserConversations,
  updateLatestMessage as updateLatestMessageQuery,
  queryCreateSession,
  queryActiveSession,
  queryExpireSessions,
  querySessionRemaining,
} from "@/lib/repositories/supabase/conversation-queries";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";

const DEFAULT_SESSION_HOURS = 24;

export const supabaseConversationRepository: ConversationRepository = {
  async createConversation(fanId, creatorId) {
    const supabase = await createSupabaseServerClient();
    return queryCreateConversation(supabase, fanId, creatorId);
  },
  async getConversation(conversationId) {
    const supabase = await createSupabaseServerClient();
    return queryConversation(supabase, conversationId);
  },
  async getConversationByUsers(fanId, creatorId) {
    const supabase = await createSupabaseServerClient();
    return queryConversationByUsers(supabase, fanId, creatorId);
  },
  async getUserConversations(userId, role) {
    const supabase = await createSupabaseServerClient();
    return queryUserConversations(supabase, userId, role);
  },
  async updateLatestMessage(conversationId, preview, at) {
    const supabase = await createSupabaseServerClient();
    await updateLatestMessageQuery(supabase, conversationId, preview, at);
  },
  async archiveConversation() {
    // No archived-state UI exists yet in this sprint — see
    // lib/repositories/conversation-repository.ts's doc comment.
    throw new Error("archiveConversation is not wired to any UI yet (Launch Sprint L3).");
  },
};

export const supabaseConversationSessionRepository: ConversationSessionRepository = {
  async createSession(conversationId, durationHours = DEFAULT_SESSION_HOURS) {
    const supabase = await createSupabaseServerClient();
    return queryCreateSession(supabase, conversationId, durationHours);
  },
  async getActiveSession(conversationId) {
    const supabase = await createSupabaseServerClient();
    return queryActiveSession(supabase, conversationId);
  },
  async renewSession(conversationId, durationHours = DEFAULT_SESSION_HOURS) {
    const supabase = await createSupabaseServerClient();
    return queryCreateSession(supabase, conversationId, durationHours);
  },
  async expireSessions(conversationId) {
    const supabase = await createSupabaseServerClient();
    await queryExpireSessions(supabase, conversationId);
  },
  async sessionRemaining(conversationId) {
    const supabase = await createSupabaseServerClient();
    return querySessionRemaining(supabase, conversationId);
  },
};
