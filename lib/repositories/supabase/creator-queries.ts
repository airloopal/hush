import type { SupabaseClient } from "@supabase/supabase-js";
import { toDiscoverCreator, type DiscoverCreator, type PublicCreatorSource } from "@/lib/discover-types";
import type { GetApprovedCreatorsOptions } from "@/lib/repositories/creator-repository";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const PUBLIC_CREATOR_COLUMNS =
  "user_id, username, display_name, avatar_url, bio, headline, banner_url, chat_price_minor, photo_price_minor, video_price_minor, availability, response_rate, average_response_minutes, completed_conversations_count, returning_fans_count, joined_creator_at, primary_category_slug, primary_category_name";

/**
 * Every read here goes through `public.public_creator_profiles` (see
 * supabase/migrations/20260701000012_public_creator_view.sql) — approved +
 * active only, no financial/administrative columns exist on the view at
 * all, so there's no risk of accidentally selecting them (§10 security).
 */
export async function queryApprovedCreators(
  supabase: Client,
  options: GetApprovedCreatorsOptions = {}
): Promise<DiscoverCreator[]> {
  let query = supabase.from("public_creator_profiles").select(PUBLIC_CREATOR_COLUMNS);

  if (options.category && options.category !== "All") {
    query = query.eq("primary_category_name", options.category);
  }
  if (options.availableOnly) {
    query = query.eq("availability", "available");
  }

  switch (options.sort) {
    case "newest":
      query = query.order("joined_creator_at", { ascending: false });
      break;
    case "most_popular":
      query = query.order("returning_fans_count", { ascending: false }).order("completed_conversations_count", { ascending: false });
      break;
    case "featured":
    default:
      // No boost/sponsorship concept in the real schema yet — most
      // recently active first is the most defensible "featured" default
      // until a real featured-placement mechanism exists.
      query = query.order("availability", { ascending: true }).order("joined_creator_at", { ascending: false });
      break;
  }

  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toDiscoverCreator(row as PublicCreatorSource));
}

export async function queryCreatorByUsername(supabase: Client, username: string): Promise<DiscoverCreator | null> {
  const { data, error } = await supabase
    .from("public_creator_profiles")
    .select(PUBLIC_CREATOR_COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toDiscoverCreator(data as PublicCreatorSource) : null;
}

/**
 * Ranked search across username, display name, headline, and category.
 * Postgres `ilike` across each column via `.or()`, then a simple client-side
 * re-rank: exact username match, then username-starts-with, then everything
 * else in whatever order Postgres returned it. This is a documented,
 * intentionally simple heuristic — see docs/discover-data.md "Search
 * ranking" for how to evolve this into real full-text search later.
 */
export async function queryCreatorSearch(supabase: Client, rawQuery: string): Promise<DiscoverCreator[]> {
  const query = rawQuery.trim();
  if (!query) return [];
  const pattern = `%${query}%`;

  const { data, error } = await supabase
    .from("public_creator_profiles")
    .select(PUBLIC_CREATOR_COLUMNS)
    .or(
      `username.ilike.${pattern},display_name.ilike.${pattern},headline.ilike.${pattern},primary_category_name.ilike.${pattern}`
    )
    .limit(50);
  if (error) throw error;

  const creators = (data ?? []).map((row) => toDiscoverCreator(row as PublicCreatorSource));
  const normalized = query.toLowerCase();

  return creators.sort((a, b) => rankSearchMatch(a, normalized) - rankSearchMatch(b, normalized));
}

function rankSearchMatch(creator: DiscoverCreator, normalizedQuery: string): number {
  const username = creator.username.toLowerCase();
  if (username === normalizedQuery) return 0;
  if (username.startsWith(normalizedQuery)) return 1;
  if (username.includes(normalizedQuery)) return 2;
  return 3;
}

/**
 * Featured ranking (§7): highest returning fans, then highest completed
 * conversations. Both are genuine columns already maintained on
 * creator_profiles. Documented evolution path: once real engagement
 * events exist, replace this with a materialized/scored ranking (e.g. a
 * weighted combination of recency, response rate, and returning-fan rate)
 * computed on a schedule rather than at request time — the interface
 * (`getFeaturedCreators(limit)`) doesn't need to change for that.
 */
export async function queryFeaturedCreators(supabase: Client, limit = 8): Promise<DiscoverCreator[]> {
  const { data, error } = await supabase
    .from("public_creator_profiles")
    .select(PUBLIC_CREATOR_COLUMNS)
    .order("returning_fans_count", { ascending: false })
    .order("completed_conversations_count", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => toDiscoverCreator(row as PublicCreatorSource));
}

export async function queryCategories(supabase: Client) {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function queryFavouriteCreatorIds(supabase: Client, fanId: string): Promise<string[]> {
  const { data, error } = await supabase.from("creator_favourites").select("creator_id").eq("fan_id", fanId);
  if (error) throw error;
  return (data ?? []).map((row) => row.creator_id);
}

export async function insertFavourite(supabase: Client, fanId: string, creatorId: string): Promise<void> {
  // RLS (creator_favourites_insert_own) enforces fan_id = auth.uid()
  // regardless of what's passed here — this parameter is for API
  // clarity, not the actual security boundary.
  const { error } = await supabase.from("creator_favourites").upsert({ fan_id: fanId, creator_id: creatorId });
  if (error) throw error;
}

export async function deleteFavourite(supabase: Client, fanId: string, creatorId: string): Promise<void> {
  const { error } = await supabase
    .from("creator_favourites")
    .delete()
    .eq("fan_id", fanId)
    .eq("creator_id", creatorId);
  if (error) throw error;
}
