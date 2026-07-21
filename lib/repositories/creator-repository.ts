import type { MockCreator } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

type PublicCreatorRow = Database["public"]["Views"]["public_creator_profiles"]["Row"];
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

/**
 * Placeholder repository interface — Phase 2.1A/2.1B foundation only.
 * list/getByUsername are the original Phase 2.1A methods (demo-era
 * MockCreator shape). Everything else is new in Phase 2.1B, typed against
 * the real schema/views — see lib/repositories/profile-repository.ts for
 * the same split rationale.
 */
export interface CreatorRepository {
  list(): Promise<MockCreator[]>;
  getByUsername(username: string): Promise<MockCreator | null>;

  /** Approved + active creators only — backed by public.public_creator_profiles. */
  getPublicCreators(): Promise<PublicCreatorRow[]>;
  getPublicCreatorByUsername(username: string): Promise<PublicCreatorRow | null>;

  /** A creator viewing/editing their own record, any status (draft included). */
  getOwnCreatorProfile(userId: string): Promise<CreatorProfileRow | null>;
  /** Approval fields, status, and aggregate/financial stats are never accepted here — enforced server-side by protect_creator_profile_admin_fields regardless. */
  updateOwnCreatorProfile(userId: string, fields: Partial<CreatorProfileEditableFields>): Promise<CreatorProfileRow>;

  getCategories(): Promise<CategoryRow[]>;

  getFavourites(fanId: string): Promise<string[]>;
  addFavourite(fanId: string, creatorId: string): Promise<void>;
  removeFavourite(fanId: string, creatorId: string): Promise<void>;
}
