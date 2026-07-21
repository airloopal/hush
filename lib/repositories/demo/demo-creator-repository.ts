import { MOCK_CREATORS } from "@/lib/creators";
import { CATEGORIES } from "@/lib/categories";
import { getFavoriteCreators, toggleFavoriteCreator, isCreatorFavorited } from "@/lib/favorites";
import {
  filterByCategory,
  searchByUsername,
  sortAllCreators,
  applyFilterChip,
  getMostReturningFansDemo,
  findCreatorByUsername,
} from "@/lib/discovery";
import type { CreatorRepository, GetApprovedCreatorsOptions } from "@/lib/repositories/creator-repository";
import type { DiscoverCreator } from "@/lib/discover-types";
import type { Database } from "@/lib/supabase/database.types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

function notAvailableInDemoMode(name: string): never {
  throw new Error(
    `${name} has no demo-mode equivalent — it operates on the real Postgres schema (see lib/supabase/database.types.ts), which the local demo doesn't have. This repository isn't called from any page yet.`
  );
}

// MockCreator already structurally satisfies DiscoverCreator (see
// lib/discover-types.ts, and lib/discovery.ts's helpers below are typed
// against DiscoverCreator directly) — no conversion needed anywhere here.

export const demoCreatorRepository: CreatorRepository = {
  async getApprovedCreators(options: GetApprovedCreatorsOptions = {}) {
    let creators: DiscoverCreator[] = MOCK_CREATORS.slice();
    if (options.category && options.category !== "All") {
      creators = filterByCategory(creators, options.category as (typeof CATEGORIES)[number]);
    }
    if (options.availableOnly) {
      creators = creators.filter((c) => c.isOnline);
    }
    switch (options.sort) {
      case "newest":
        creators = applyFilterChip(creators, "newest");
        break;
      case "most_popular":
        creators = getMostReturningFansDemo(creators);
        break;
      case "featured":
      default:
        creators = sortAllCreators(creators);
        break;
    }
    if (options.limit) creators = creators.slice(0, options.limit);
    return creators;
  },

  async getCreatorByUsername(username) {
    return findCreatorByUsername(MOCK_CREATORS, username) ?? null;
  },

  async searchCreators(query) {
    // Demo-mode ranking: username match first, then bio/category text
    // match — see docs/discover-data.md for how the real implementation
    // ranks (username > display_name > headline > category).
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    const usernameMatches = searchByUsername(MOCK_CREATORS, normalized);
    const otherMatches = MOCK_CREATORS.filter(
      (c) =>
        !usernameMatches.includes(c) &&
        (c.bio.toLowerCase().includes(normalized) || c.category.toLowerCase().includes(normalized))
    );
    return [...usernameMatches, ...otherMatches];
  },

  async getFeaturedCreators(limit = 8) {
    return getMostReturningFansDemo(MOCK_CREATORS).slice(0, limit);
  },

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

  async getFavouriteCreators(fanId) {
    void fanId; // demo favourites are single-local-user, not keyed by fan id
    return getFavoriteCreators();
  },
  async favouriteCreator(fanId, creatorId) {
    void fanId;
    if (!isCreatorFavorited(creatorId)) toggleFavoriteCreator(creatorId);
  },
  async unfavouriteCreator(fanId, creatorId) {
    void fanId;
    if (isCreatorFavorited(creatorId)) toggleFavoriteCreator(creatorId);
  },

  async getOwnCreatorProfile() {
    notAvailableInDemoMode("CreatorRepository.getOwnCreatorProfile");
  },
  async updateOwnCreatorProfile() {
    notAvailableInDemoMode("CreatorRepository.updateOwnCreatorProfile");
  },
};
