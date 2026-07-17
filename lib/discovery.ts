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
