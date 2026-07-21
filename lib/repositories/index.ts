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
 * Phase 2.1A: every Supabase repository is a placeholder that throws (see
 * lib/repositories/supabase/index.ts), so this factory currently always
 * resolves to the demo implementations regardless of environment — the
 * existing local demo experience is completely unaffected. Flipping a
 * repository over to Supabase later is a one-line change in this file.
 */

import { isSupabaseConfigured } from "@/lib/supabase/env";

import { demoProfileRepository } from "@/lib/repositories/demo/demo-profile-repository";
import { demoCreatorRepository } from "@/lib/repositories/demo/demo-creator-repository";
import { demoConversationRepository } from "@/lib/repositories/demo/demo-conversation-repository";
import { demoMessageRepository } from "@/lib/repositories/demo/demo-message-repository";
import { demoPurchaseRepository } from "@/lib/repositories/demo/demo-purchase-repository";
import { demoNotificationRepository } from "@/lib/repositories/demo/demo-notification-repository";

import {
  supabaseProfileRepository,
  supabaseCreatorRepository,
  supabaseConversationRepository,
  supabaseMessageRepository,
  supabasePurchaseRepository,
  supabaseNotificationRepository,
} from "@/lib/repositories/supabase";

import type { ProfileRepository } from "@/lib/repositories/profile-repository";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { MessageRepository } from "@/lib/repositories/message-repository";
import type { PurchaseRepository } from "@/lib/repositories/purchase-repository";
import type { NotificationRepository } from "@/lib/repositories/notification-repository";

export interface Repositories {
  profiles: ProfileRepository;
  creators: CreatorRepository;
  conversations: ConversationRepository;
  messages: MessageRepository;
  purchases: PurchaseRepository;
  notifications: NotificationRepository;
}

/**
 * Always returns demo repositories today (see note above). Once a given
 * Supabase repository is genuinely implemented, its line below flips to
 * `useSupabase ? supabaseX : demoX`.
 */
export function getRepositories(): Repositories {
  const useSupabase = isSupabaseConfigured();

  return {
    // Genuinely implemented in Phase 2.2A — safe to flip now that
    // Supabase auth actually needs real profile/creator data.
    profiles: useSupabase ? supabaseProfileRepository : demoProfileRepository,
    creators: useSupabase ? supabaseCreatorRepository : demoCreatorRepository,
    // Still unimplemented stubs — stay on demo until each is built out.
    conversations: demoConversationRepository,
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
  supabaseMessageRepository,
  supabasePurchaseRepository,
  supabaseNotificationRepository,
};
