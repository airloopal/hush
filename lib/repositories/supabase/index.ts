/**
 * Supabase-backed repositories — Phase 2.1A placeholders only.
 *
 * None of these are implemented yet. They exist so lib/repositories/index.ts
 * has a real, typed second branch to select between, and so future work can
 * fill in one repository at a time without touching this file's shape or
 * any calling code (which only ever depends on the interfaces, not on
 * which implementation is active).
 */

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
  async getById() {
    notImplemented("supabaseProfileRepository.getById");
  },
  async updateOwnProfile() {
    notImplemented("supabaseProfileRepository.updateOwnProfile");
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
  async getOwnCreatorProfile() {
    notImplemented("supabaseCreatorRepository.getOwnCreatorProfile");
  },
  async updateOwnCreatorProfile() {
    notImplemented("supabaseCreatorRepository.updateOwnCreatorProfile");
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
