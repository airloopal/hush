/**
 * The shape CreatorTile, CreatorSection, and the creator profile page
 * actually render. Demo mode's `MockCreator` (lib/types.ts) already
 * satisfies this structurally — its `category` field is a string-literal
 * union, which is a subtype of `string` here, and every other field name
 * matches exactly. Supabase mode adapts `PublicCreatorRow` into this same
 * shape (see toDiscoverCreator below) so the presentation components
 * never need to know which mode produced the data.
 */
export interface DiscoverCreator {
  id: string;
  username: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bannerColor?: string;
  category: string;
  categorySlug?: string;
  headline?: string;
  bio: string;
  lastSeenMinutes: number;
  isOnline: boolean;
  availability?: "available" | "busy" | "offline";
  averageReplyMinutes: number;
  responseRate?: number;
  chatPrice: string;
  photoPrice: string;
  videoPrice: string;
  joinedAt: string;
  isNew: boolean;
  boostEndsAt?: string;
  isAdult: boolean;
  followers?: number;
  conversationCount?: number;
  returningFansCount?: number;
}

function centsToDecimalString(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

function isRecentlyJoined(iso: string, withinDays = 14): boolean {
  const joinedAt = new Date(iso).getTime();
  if (Number.isNaN(joinedAt)) return false;
  return Date.now() - joinedAt <= withinDays * 24 * 60 * 60 * 1000;
}

/** Minimal shape needed from the public_creator_profiles view/row — kept
 * decoupled from the generated Database type so this file has no import
 * cycle risk and stays easy to unit test. */
export interface PublicCreatorSource {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  banner_url: string | null;
  chat_price_minor: number;
  photo_price_minor: number;
  video_price_minor: number;
  availability: "available" | "busy" | "offline";
  response_rate: number | null;
  average_response_minutes: number | null;
  completed_conversations_count: number;
  returning_fans_count: number;
  joined_creator_at: string;
  primary_category_slug: string | null;
  primary_category_name: string | null;
}

/**
 * Adapts a real database row into the shape the existing UI already
 * renders. Deliberate, documented simplifications where the two data
 * models don't map 1:1:
 * - `availability` has three states; the UI's isOnline is binary, so only
 *   'available' counts as online for now (see docs/discover-data.md).
 * - There's no per-creator "last seen" pipeline yet, so lastSeenMinutes is
 *   always 0 — harmless, since it's only ever displayed when isOnline is
 *   false, where it reads as generic "Offline" rather than "Offline Nm ago".
 * - `followers` has no equivalent in the real schema yet — omitted rather
 *   than fabricated.
 */
export function toDiscoverCreator(row: PublicCreatorSource): DiscoverCreator {
  return {
    id: row.user_id,
    username: row.username ?? row.user_id,
    avatarUrl: row.avatar_url ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    category: row.primary_category_name ?? "Uncategorized",
    categorySlug: row.primary_category_slug ?? undefined,
    headline: row.headline ?? undefined,
    bio: row.bio ?? "",
    lastSeenMinutes: 0,
    isOnline: row.availability === "available",
    availability: row.availability,
    averageReplyMinutes: row.average_response_minutes ?? 30,
    responseRate: row.response_rate ?? undefined,
    chatPrice: centsToDecimalString(row.chat_price_minor),
    photoPrice: centsToDecimalString(row.photo_price_minor),
    videoPrice: centsToDecimalString(row.video_price_minor),
    joinedAt: row.joined_creator_at,
    isNew: isRecentlyJoined(row.joined_creator_at),
    isAdult: row.primary_category_slug === "adult-18-plus",
    conversationCount: row.completed_conversations_count,
    returningFansCount: row.returning_fans_count,
  };
}
