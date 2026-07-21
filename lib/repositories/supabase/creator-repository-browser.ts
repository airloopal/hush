"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  queryApprovedCreators,
  queryCreatorByUsername,
  queryCreatorSearch,
  queryFeaturedCreators,
  queryCategories,
  queryFavouriteCreatorIds,
  insertFavourite,
  deleteFavourite,
} from "@/lib/repositories/supabase/creator-queries";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";

function notAvailableInBrowser(name: string): never {
  throw new Error(
    `${name} requires a server-side session context and isn't available from the browser repository. See lib/repositories/supabase/index.ts.`
  );
}

/**
 * Same interface, same query logic (lib/repositories/supabase/creator-queries.ts)
 * as lib/repositories/supabase/index.ts's supabaseCreatorRepository — the
 * only difference is which Supabase client backs it. Discover and the
 * creator profile page are Client Components (unchanged from before this
 * sprint, per "do not redesign"), so they need a client-safe repository;
 * `lib/supabase/server.ts` is guarded with `server-only` and would fail
 * the build if imported here.
 */
export const supabaseCreatorRepositoryBrowser: CreatorRepository = {
  async getApprovedCreators(options) {
    return queryApprovedCreators(createSupabaseBrowserClient(), options);
  },
  async getCreatorByUsername(username) {
    return queryCreatorByUsername(createSupabaseBrowserClient(), username);
  },
  async searchCreators(query) {
    return queryCreatorSearch(createSupabaseBrowserClient(), query);
  },
  async getFeaturedCreators(limit) {
    return queryFeaturedCreators(createSupabaseBrowserClient(), limit);
  },
  async getCategories() {
    return queryCategories(createSupabaseBrowserClient());
  },
  async getFavouriteCreators(fanId) {
    return queryFavouriteCreatorIds(createSupabaseBrowserClient(), fanId);
  },
  async favouriteCreator(fanId, creatorId) {
    await insertFavourite(createSupabaseBrowserClient(), fanId, creatorId);
  },
  async unfavouriteCreator(fanId, creatorId) {
    await deleteFavourite(createSupabaseBrowserClient(), fanId, creatorId);
  },

  async getOwnCreatorProfile() {
    notAvailableInBrowser("CreatorRepository.getOwnCreatorProfile");
  },
  async updateOwnCreatorProfile() {
    notAvailableInBrowser("CreatorRepository.updateOwnCreatorProfile");
  },
};
