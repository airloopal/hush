"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

export const supabaseConversationRepositoryBrowser: ConversationRepository = {
  async createConversation(fanId, creatorId) {
    return queryCreateConversation(createSupabaseBrowserClient(), fanId, creatorId);
  },
  async getConversation(conversationId) {
    return queryConversation(createSupabaseBrowserClient(), conversationId);
  },
  async getConversationByUsers(fanId, creatorId) {
    return queryConversationByUsers(createSupabaseBrowserClient(), fanId, creatorId);
  },
  async getUserConversations(userId, role) {
    return queryUserConversations(createSupabaseBrowserClient(), userId, role);
  },
  async updateLatestMessage(conversationId, preview, at) {
    await updateLatestMessageQuery(createSupabaseBrowserClient(), conversationId, preview, at);
  },
  async archiveConversation() {
    throw new Error("archiveConversation is not wired to any UI yet (Launch Sprint L3).");
  },
};

export const supabaseConversationSessionRepositoryBrowser: ConversationSessionRepository = {
  async createSession(conversationId, durationHours = DEFAULT_SESSION_HOURS) {
    return queryCreateSession(createSupabaseBrowserClient(), conversationId, durationHours);
  },
  async getActiveSession(conversationId) {
    return queryActiveSession(createSupabaseBrowserClient(), conversationId);
  },
  async renewSession(conversationId, durationHours = DEFAULT_SESSION_HOURS) {
    return queryCreateSession(createSupabaseBrowserClient(), conversationId, durationHours);
  },
  async expireSessions(conversationId) {
    await queryExpireSessions(createSupabaseBrowserClient(), conversationId);
  },
  async sessionRemaining(conversationId) {
    return querySessionRemaining(createSupabaseBrowserClient(), conversationId);
  },
};
