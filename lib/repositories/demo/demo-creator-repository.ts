import { MOCK_CREATORS } from "@/lib/creators";
import { findCreatorByUsername } from "@/lib/discovery";
import { CATEGORIES } from "@/lib/categories";
import { getFavoriteCreators, toggleFavoriteCreator, isCreatorFavorited } from "@/lib/favorites";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";
import type { Database } from "@/lib/supabase/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

function notAvailableInDemoMode(name: string): never {
  throw new Error(
    `${name} has no demo-mode equivalent — it operates on the real Postgres schema (see lib/supabase/database.types.ts), which the local demo doesn't have. This repository isn't called from any page yet.`
  );
}

export const demoCreatorRepository: CreatorRepository = {
  async list() {
    return MOCK_CREATORS;
  },
  async getByUsername(username) {
    return findCreatorByUsername(MOCK_CREATORS, username) ?? null;
  },

  async getPublicCreators() {
    notAvailableInDemoMode("CreatorRepository.getPublicCreators");
  },
  async getPublicCreatorByUsername() {
    notAvailableInDemoMode("CreatorRepository.getPublicCreatorByUsername");
  },
  async getOwnCreatorProfile() {
    notAvailableInDemoMode("CreatorRepository.getOwnCreatorProfile");
  },
  async updateOwnCreatorProfile() {
    notAvailableInDemoMode("CreatorRepository.updateOwnCreatorProfile");
  },

  // Demo categories are a flat string enum (lib/categories.ts), not real
  // rows — synthesized into a minimal-but-honest CategoryRow shape rather
  // than declining outright, since Discover's category filtering already
  // depends on an equivalent list today.
  async getCategories(): Promise<CategoryRow[]> {
    const now = new Date().toISOString();
    return CATEGORIES.map((name, index) => ({
      id: name,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: null,
      is_adult: name === "Adult 18+",
      is_active: true,
      sort_order: index,
      created_at: now,
      updated_at: now,
    }));
  },

  // Favourites genuinely exist in demo mode already (lib/favorites.ts) —
  // wrap them directly rather than declining.
  async getFavourites(fanId) {
    void fanId; // demo favourites are single-local-user, not keyed by fan id
    return getFavoriteCreators();
  },
  async addFavourite(fanId, creatorId) {
    void fanId;
    if (!isCreatorFavorited(creatorId)) toggleFavoriteCreator(creatorId);
  },
  async removeFavourite(fanId, creatorId) {
    void fanId;
    if (isCreatorFavorited(creatorId)) toggleFavoriteCreator(creatorId);
  },
};
