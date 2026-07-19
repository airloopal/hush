/**
 * Purely decorative data for the public landing page's creator showcase.
 * Deliberately NOT the same as lib/creators.ts (MOCK_CREATORS) or
 * lib/categories.ts — those drive real app behavior (Discover, onboarding)
 * and must not change for this marketing sprint. This is presentational
 * only, with its own simplified category labels matching the brief.
 */

export interface LandingShowcaseCreator {
  displayName: string;
  category: string;
  chatPrice: string;
  isOnline: boolean;
}

export const LANDING_SHOWCASE_CREATORS: LandingShowcaseCreator[] = [
  { displayName: "Theo Lindqvist", category: "Gaming", chatPrice: "19.00", isOnline: true },
  { displayName: "Ines Carvalho", category: "Music", chatPrice: "19.00", isOnline: false },
  { displayName: "Priya Nandan", category: "Fitness", chatPrice: "22.00", isOnline: true },
  { displayName: "Maya Okoye", category: "Lifestyle", chatPrice: "14.00", isOnline: true },
  { displayName: "Elle Sinclair", category: "Fashion", chatPrice: "21.00", isOnline: false },
  { displayName: "Jamal Delacruz", category: "Sport", chatPrice: "17.00", isOnline: true },
  { displayName: "Ms. Alvarez", category: "Education", chatPrice: "20.00", isOnline: false },
  { displayName: "Daniel Ferris", category: "Business", chatPrice: "35.00", isOnline: false },
  { displayName: "Sasha Inkwell", category: "Art", chatPrice: "18.00", isOnline: true },
  { displayName: "Ruby Sinclair", category: "18+", chatPrice: "29.00", isOnline: true },
];
