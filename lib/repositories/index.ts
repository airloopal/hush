/**
 * Central repository factory.
 *
 * This is the single place in the app that decides whether a given
 * repository is backed by local/demo storage or by Supabase. Application
 * code should always go through `getRepositories()` rather than importing
 * a demo/* or supabase/* implementation directly, and should never check
 * `isSupabaseConfigured()` itself — that check belongs here only, so it's
 * never scattered across components.
 *
 * Every Supabase repository not yet genuinely implemented is a placeholder
 * that throws (see lib/repositories/supabase/index.ts), so this factory
 * falls back to demo for those regardless of environment. Flipping a
 * repository over to Supabase once it's implemented is a one-line change
 * in this file — profiles, creators, conversations, and conversation
 * sessions have already made that flip.
 */

import { isSupabaseConfigured } from "@/lib/supabase/env";

import { demoProfileRepository } from "@/lib/repositories/demo/demo-profile-repository";
import { demoCreatorRepository } from "@/lib/repositories/demo/demo-creator-repository";
import { demoConversationRepository, demoConversationSessionRepository } from "@/lib/repositories/demo/demo-conversation-engine";
import { demoMessageRepository } from "@/lib/repositories/demo/demo-message-repository";
import { demoPurchaseRepository } from "@/lib/repositories/demo/demo-purchase-repository";
import { demoNotificationRepository } from "@/lib/repositories/demo/demo-notification-repository";

import {
  supabaseProfileRepository,
  supabaseCreatorRepository,
  supabaseMessageRepository,
  supabasePurchaseRepository,
  supabaseNotificationRepository,
} from "@/lib/repositories/supabase";
import {
  supabaseConversationRepository,
  supabaseConversationSessionRepository,
} from "@/lib/repositories/supabase/conversation-repository-server";

import type { ProfileRepository } from "@/lib/repositories/profile-repository";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { ConversationSessionRepository } from "@/lib/repositories/conversation-session-repository";
import type { MessageRepository } from "@/lib/repositories/message-repository";
import type { PurchaseRepository } from "@/lib/repositories/purchase-repository";
import type { NotificationRepository } from "@/lib/repositories/notification-repository";

export interface Repositories {
  profiles: ProfileRepository;
  creators: CreatorRepository;
  conversations: ConversationRepository;
  conversationSessions: ConversationSessionRepository;
  messages: MessageRepository;
  purchases: PurchaseRepository;
  notifications: NotificationRepository;
}

export function getRepositories(): Repositories {
  const useSupabase = isSupabaseConfigured();

  return {
    profiles: useSupabase ? supabaseProfileRepository : demoProfileRepository,
    creators: useSupabase ? supabaseCreatorRepository : demoCreatorRepository,
    // Launch Sprint L3 — genuinely implemented.
    conversations: useSupabase ? supabaseConversationRepository : demoConversationRepository,
    conversationSessions: useSupabase ? supabaseConversationSessionRepository : demoConversationSessionRepository,
    // Still unimplemented stubs — stay on demo until each is built out.
    messages: demoMessageRepository,
    purchases: demoPurchaseRepository,
    notifications: demoNotificationRepository,
  };
}

// Re-exported so a future migration can reference the Supabase set directly
// without re-importing from lib/repositories/supabase in every call site.
export {
  supabaseProfileRepository,
  supabaseCreatorRepository,
  supabaseConversationRepository,
  supabaseConversationSessionRepository,
  supabaseMessageRepository,
  supabasePurchaseRepository,
  supabaseNotificationRepository,
};
