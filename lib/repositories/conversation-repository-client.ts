"use client";

import { isDemoMode } from "@/lib/auth/mode";
import { demoConversationRepository, demoConversationSessionRepository } from "@/lib/repositories/demo/demo-conversation-engine";
import {
  supabaseConversationRepositoryBrowser,
  supabaseConversationSessionRepositoryBrowser,
} from "@/lib/repositories/supabase/conversation-repository-browser";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";

/** The only conversation/session repository import Client Components
 * should use — same rationale as getClientCreatorRepository(). */
export function getClientConversationRepository(): ConversationRepository {
  return isDemoMode() ? demoConversationRepository : supabaseConversationRepositoryBrowser;
}

export function getClientConversationSessionRepository(): ConversationSessionRepository {
  return isDemoMode() ? demoConversationSessionRepository : supabaseConversationSessionRepositoryBrowser;
}
