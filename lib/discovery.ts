import { CATEGORIES, SAFE_CATEGORIES, type Category } from "@/lib/categories";
import type { MockCreator } from "@/lib/types";

export type CategoryFilter = Category | "All";

/** Adult creators are removed entirely unless the viewer has adult access. */
export function filterByAdultAccess(
  creators: MockCreator[],
  hasAdultAccess: boolean
): MockCreator[] {
  return hasAdultAccess ? creators : creators.filter((creator) => !creator.isAdult);
}

export function searchByUsername(creators: MockCreator[], query: string): MockCreator[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return creators;
  return creators.filter((creator) => creator.username.toLowerCase().includes(normalized));
}

export function filterByCategory(
  creators: MockCreator[],
  category: CategoryFilter
): MockCreator[] {
  if (category === "All") return creators;
  return creators.filter((creator) => creator.category === category);
}

/** Online first, then lowest lastSeenMinutes (most recently active). */
export function sortRecentlyActive(creators: MockCreator[]): MockCreator[] {
  return [...creators].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    return a.lastSeenMinutes - b.lastSeenMinutes;
  });
}

/** Online first, then recent activity, then username A→Z. */
export function sortAllCreators(creators: MockCreator[]): MockCreator[] {
  return [...creators].sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.lastSeenMinutes !== b.lastSeenMinutes) return a.lastSeenMinutes - b.lastSeenMinutes;
    return a.username.localeCompare(b.username);
  });
}

export function getSponsoredCreators(creators: MockCreator[]): MockCreator[] {
  const now = Date.now();
  return creators.filter(
    (creator) => creator.boostEndsAt && new Date(creator.boostEndsAt).getTime() > now
  );
}

export function getNewCreators(creators: MockCreator[]): MockCreator[] {
  return creators.filter((creator) => creator.isNew);
}

/** Hides the Adult 18+ pill entirely when the viewer lacks adult access. */
export function visibleCategories(hasAdultAccess: boolean): Category[] {
  return hasAdultAccess ? [...CATEGORIES] : SAFE_CATEGORIES;
}

export function findCreatorByUsername(
  creators: MockCreator[],
  username: string
): MockCreator | undefined {
  return creators.find((creator) => creator.username === username);
}

// ---------------------------------------------------------------------------
// Featured collections (Sprint 5A.4) — all derived from existing MockCreator
// fields, no new storage. "Demo" collections use a plausible-but-synthetic
// heuristic over seeded data rather than any real engagement metric.
// ---------------------------------------------------------------------------

/** Sponsored first, then most recently active — a reasonable "what's hot
 * right now" proxy from existing fields. */
export function getTrendingCreators(creators: MockCreator[]): MockCreator[] {
  const now = Date.now();
  return [...creators].sort((a, b) => {
    const aBoosted = !!a.boostEndsAt && new Date(a.boostEndsAt).getTime() > now;
    const bBoosted = !!b.boostEndsAt && new Date(b.boostEndsAt).getTime() > now;
    if (aBoosted !== bBoosted) return aBoosted ? -1 : 1;
    return a.lastSeenMinutes - b.lastSeenMinutes;
  });
}

export function getFastResponders(creators: MockCreator[], maxMinutes = 10): MockCreator[] {
  return creators
    .filter((creator) => creator.averageReplyMinutes <= maxMinutes)
    .sort((a, b) => a.averageReplyMinutes - b.averageReplyMinutes);
}

export function getOnlineNowCreators(creators: MockCreator[]): MockCreator[] {
  return creators.filter((creator) => creator.isOnline);
}

/** Highest chat price first — "premium" as in price tier, not a quality claim. */
export function getPremiumPicks(creators: MockCreator[]): MockCreator[] {
  return [...creators].sort(
    (a, b) => (Number.parseFloat(b.chatPrice) || 0) - (Number.parseFloat(a.chatPrice) || 0)
  );
}

/** Demo-only heuristic: highest conversationCount as a stand-in for repeat
 * engagement, since most seeded creators have no real per-fan history. */
export function getMostReturningFansDemo(creators: MockCreator[]): MockCreator[] {
  return [...creators].sort((a, b) => (b.conversationCount ?? 0) - (a.conversationCount ?? 0));
}

export type CreatorFilterChip = "online" | "available-today" | "fast-reply" | "lowest-price" | "highest-rated" | "newest";

/** Filter-chip predicates for the Discover filter bar. "highest-rated" is a
 * demo-only heuristic (followers count) since there's no real rating data. */
export function applyFilterChip(creators: MockCreator[], chip: CreatorFilterChip): MockCreator[] {
  switch (chip) {
    case "online":
      return creators.filter((c) => c.isOnline);
    case "available-today":
      return creators.filter((c) => c.isOnline || c.lastSeenMinutes < 24 * 60);
    case "fast-reply":
      return [...creators].sort((a, b) => a.averageReplyMinutes - b.averageReplyMinutes);
    case "lowest-price":
      return [...creators].sort((a, b) => (Number.parseFloat(a.chatPrice) || 0) - (Number.parseFloat(b.chatPrice) || 0));
    case "highest-rated":
      return [...creators].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
    case "newest":
      return [...creators].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    default:
      return creators;
  }
}
