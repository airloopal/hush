const DISCOVER_FILTERS_KEY = "hush:discover-filters";

export interface DiscoverFilterState {
  search: string;
  /** Category name or "All". Stored as a plain string and re-validated by
   * the caller against the currently visible category list, since a
   * previously-visible category (e.g. Adult 18+) may no longer be valid if
   * adult access changed. */
  category: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Safe against a missing/cleared session, malformed JSON, or a shape that
 * doesn't match what we expect — always falls back to null rather than
 * throwing. */
export function readDiscoverFilters(): DiscoverFilterState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(DISCOVER_FILTERS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { search, category } = parsed as Record<string, unknown>;
    if (typeof search !== "string" || typeof category !== "string") return null;
    return { search, category };
  } catch {
    return null;
  }
}

export function writeDiscoverFilters(state: DiscoverFilterState): void {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(DISCOVER_FILTERS_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota/serialization errors in this prototype.
  }
}
