import type { Account } from "@/lib/types";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileEditableFields = Pick<
  ProfileRow,
  "username" | "display_name" | "avatar_url" | "bio" | "country_code" | "timezone" | "adult_content_enabled"
>;

/**
 * Placeholder repository interface — Phase 2.1A/2.1B foundation only.
 * Method shapes are async because a real Supabase-backed implementation
 * will be; the demo implementation just wraps today's synchronous
 * localStorage calls in a resolved Promise so both can satisfy this same
 * interface.
 *
 * getByUsername/upsert are the original Phase 2.1A methods, still typed
 * against the demo-era Account shape (see lib/types.ts) since that's what
 * the demo implementation actually returns today. getById/updateOwnProfile
 * are new in Phase 2.1B and typed against the real `profiles` table row
 * (see lib/supabase/database.types.ts) — they exist as the schema-accurate
 * shape a future page migration will call; nothing calls them yet.
 */
export interface ProfileRepository {
  getByUsername(username: string): Promise<Account | null>;
  upsert(account: Account): Promise<void>;

  /** Real-schema equivalent of getByUsername, keyed by profiles.id (== auth.users.id). */
  getById(id: string): Promise<ProfileRow | null>;
  /** Updates only the fields a user is allowed to change on their own profile — role/status are never accepted here, matching the protect_profile_role_status trigger. */
  updateOwnProfile(id: string, fields: Partial<ProfileEditableFields>): Promise<ProfileRow>;
}
