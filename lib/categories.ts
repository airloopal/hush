/**
 * Shared category list for creator categories, fan interests, and the
 * Discover category filter. Single source of truth so onboarding, the
 * marketplace, and mock data never drift out of sync.
 */

export const CATEGORIES = [
  "Gaming",
  "Music",
  "Fitness",
  "Lifestyle",
  "Expert",
  "Technology",
  "Education",
  "Sports",
  "Fashion",
  "Art",
  "Adult 18+",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** The one category gated behind explicit 18+ confirmation. */
export const ADULT_CATEGORY: Category = "Adult 18+";

/** All categories except the gated adult one. */
export const SAFE_CATEGORIES: Category[] = CATEGORIES.filter(
  (category) => category !== ADULT_CATEGORY
);

export function isAdultCategory(category: Category): boolean {
  return category === ADULT_CATEGORY;
}
