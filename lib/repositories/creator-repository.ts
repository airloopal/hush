import type { Database } from "@/lib/supabase/database.types";
import type { DiscoverCreator } from "@/lib/discover-types";

type CreatorProfileRow = Database["public"]["Tables"]["creator_profiles"]["Row"];
type CreatorProfileEditableFields = Pick<
  CreatorProfileRow,
  | "headline"
  | "about"
  | "banner_url"
  | "primary_category_id"
  | "chat_price_minor"
  | "photo_price_minor"
  | "video_price_minor"
  | "availability"
>;
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

export type CreatorSortOrder = "featured" | "newest" | "most_popular";

export interface GetApprovedCreatorsOptions {
  category?: string;
  availableOnly?: boolean;
  sort?: CreatorSortOrder;
  limit?: number;
}

/**
 * Fully implemented — Launch Sprint L2. Both the demo (lib/repositories/demo/)
 * and Supabase (lib/repositories/supabase/) implementations return
 * `DiscoverCreator[]`/`DiscoverCreator | null` so Discover and the creator
 * profile page render identically regardless of which mode produced the
 * data (see lib/discover-types.ts).
 *
 * getOwnCreatorProfile/updateOwnCreatorProfile remain separate — they
 * operate on the creator's own row (any status, full field set) for
 * self-service editing, not the public discovery surface.
 */
export interface CreatorRepository {
  getApprovedCreators(options?: GetApprovedCreatorsOptions): Promise<DiscoverCreator[]>;
  getCreatorByUsername(username: string): Promise<DiscoverCreator | null>;
  searchCreators(query: string): Promise<DiscoverCreator[]>;
  getFeaturedCreators(limit?: number): Promise<DiscoverCreator[]>;
  getCategories(): Promise<CategoryRow[]>;

  getFavouriteCreators(fanId: string): Promise<string[]>;
  favouriteCreator(fanId: string, creatorId: string): Promise<void>;
  unfavouriteCreator(fanId: string, creatorId: string): Promise<void>;

  getOwnCreatorProfile(userId: string): Promise<CreatorProfileRow | null>;
  updateOwnCreatorProfile(userId: string, fields: Partial<CreatorProfileEditableFields>): Promise<CreatorProfileRow>;
}
