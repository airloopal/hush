/**
 * Supabase-backed repositories — Phase 2.1A placeholders only.
 *
 * None of these are implemented yet. They exist so lib/repositories/index.ts
 * has a real, typed second branch to select between, and so future work can
 * fill in one repository at a time without touching this file's shape or
 * any calling code (which only ever depends on the interfaces, not on
 * which implementation is active).
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProfileRepository } from "@/lib/repositories/profile-repository";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";
import type { ConversationRepository } from "@/lib/repositories/conversation-repository";
import type { MessageRepository } from "@/lib/repositories/message-repository";
import type { PurchaseRepository } from "@/lib/repositories/purchase-repository";
import type { NotificationRepository } from "@/lib/repositories/notification-repository";

function notImplemented(name: string): never {
  throw new Error(
    `${name} is not implemented yet — Phase 2.1A only sets up the Supabase foundation. ` +
      `See docs/supabase-setup.md and lib/repositories/index.ts.`
  );
}

export const supabaseProfileRepository: ProfileRepository = {
  async getByUsername() {
    notImplemented("supabaseProfileRepository.getByUsername");
  },
  async upsert() {
    notImplemented("supabaseProfileRepository.upsert");
  },

  // Phase 2.2A: implemented for real — the auth flow's profile
  // synchronization (lib/auth/current-user.ts) needs genuine data here.
  async getById(id) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
  async updateOwnProfile(id, fields) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};

export const supabaseCreatorRepository: CreatorRepository = {
  async list() {
    notImplemented("supabaseCreatorRepository.list");
  },
  async getByUsername() {
    notImplemented("supabaseCreatorRepository.getByUsername");
  },
  async getPublicCreators() {
    notImplemented("supabaseCreatorRepository.getPublicCreators");
  },
  async getPublicCreatorByUsername() {
    notImplemented("supabaseCreatorRepository.getPublicCreatorByUsername");
  },

  // Phase 2.2A: implemented for real — needed to show a creator's
  // approval status (draft/pending_review/approved/etc.) after login and
  // to let creator onboarding submit pricing/category selections.
  async getOwnCreatorProfile(userId) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },
  async updateOwnCreatorProfile(userId, fields) {
    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase
      .from("creator_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    const query = existing
      ? supabase.from("creator_profiles").update(fields).eq("user_id", userId)
      : supabase.from("creator_profiles").insert({ user_id: userId, ...fields });

    const { data, error } = await query.select("*").single();
    if (error) throw error;
    return data;
  },

  async getCategories() {
    notImplemented("supabaseCreatorRepository.getCategories");
  },
  async getFavourites() {
    notImplemented("supabaseCreatorRepository.getFavourites");
  },
  async addFavourite() {
    notImplemented("supabaseCreatorRepository.addFavourite");
  },
  async removeFavourite() {
    notImplemented("supabaseCreatorRepository.removeFavourite");
  },
};

export const supabaseConversationRepository: ConversationRepository = {
  async listForFan() {
    notImplemented("supabaseConversationRepository.listForFan");
  },
  async listForCreator() {
    notImplemented("supabaseConversationRepository.listForCreator");
  },
  async getById() {
    notImplemented("supabaseConversationRepository.getById");
  },
};

export const supabaseMessageRepository: MessageRepository = {
  async listForSession() {
    notImplemented("supabaseMessageRepository.listForSession");
  },
  async add() {
    notImplemented("supabaseMessageRepository.add");
  },
};

export const supabasePurchaseRepository: PurchaseRepository = {
  async listForFan() {
    notImplemented("supabasePurchaseRepository.listForFan");
  },
  async listForCreator() {
    notImplemented("supabasePurchaseRepository.listForCreator");
  },
};

export const supabaseNotificationRepository: NotificationRepository = {
  async listForUser() {
    notImplemented("supabaseNotificationRepository.listForUser");
  },
  async markRead() {
    notImplemented("supabaseNotificationRepository.markRead");
  },
};
