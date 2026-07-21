"use client";

import * as React from "react";
import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { DiscoverHero } from "@/components/discover-hero";
import { DiscoverFilters } from "@/components/discover-filters";
import { DiscoverFilterBar } from "@/components/discover-filter-bar";
import { CreatorSection } from "@/components/creator-section";
import { EmptyState } from "@/components/empty-state";
import { useRequireRole } from "@/lib/use-account-guard";
import { hasAdultAccess } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import { isDemoMode } from "@/lib/auth/mode";
import { getClientCreatorRepository } from "@/lib/repositories/creator-repository-client";
import { useCreatorFavorites } from "@/lib/use-creator-favorites";
import {
  addRecentSearch,
  readDiscoverFilters,
  readRecentSearches,
  writeDiscoverFilters,
} from "@/lib/discover-session";
import { getPrivacySettings } from "@/lib/preferences";
import type { Category } from "@/lib/categories";
import type { DiscoverCreator } from "@/lib/discover-types";
import {
  applyFilterChip,
  filterByAdultAccess,
  filterByCategory,
  getFastResponders,
  getNewCreators,
  getOnlineNowCreators,
  getPremiumPicks,
  getSponsoredCreators,
  getTrendingCreators,
  searchByUsername,
  sortAllCreators,
  visibleCategories,
  type CategoryFilter,
  type CreatorFilterChip,
} from "@/lib/discovery";
import { AlertTriangle, Loader2 } from "lucide-react";

// Debounce so real-mode search doesn't fire a query on every keystroke.
const SEARCH_DEBOUNCE_MS = 300;

export default function DiscoverPage() {
  const { ready, account } = useRequireRole("fan");
  const demoMode = isDemoMode();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("All");
  const [filterChip, setFilterChip] = React.useState<CreatorFilterChip | null>(null);
  const [restored, setRestored] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [allowRecommendations] = React.useState(() => getPrivacySettings().allowCreatorRecommendations);
  const { favorites } = useCreatorFavorites();

  // Real-mode data: fetched once on arrival, then filtered/derived
  // client-side with the exact same pure functions demo mode already uses
  // (lib/discovery.ts) — see lib/discover-types.ts for how a Supabase row
  // is adapted into the same shape MOCK_CREATORS already has.
  const [remoteCreators, setRemoteCreators] = React.useState<DiscoverCreator[] | null>(null);
  const [remoteFeatured, setRemoteFeatured] = React.useState<DiscoverCreator[] | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [loading, setLoading] = React.useState(!demoMode);

  // Server-backed search results (§5) — only used in real mode when there's
  // an active search term; category/chip filtering stays client-side over
  // the already-fetched approved-creator list, same as demo mode.
  const [searchResults, setSearchResults] = React.useState<DiscoverCreator[] | null>(null);
  const [searching, setSearching] = React.useState(false);

  const adultAllowed = hasAdultAccess(account);

  React.useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const repo = getClientCreatorRepository();
    Promise.all([repo.getApprovedCreators(), repo.getFeaturedCreators(8)])
      .then(([approved, featured]) => {
        if (cancelled) return;
        setRemoteCreators(approved);
        setRemoteFeatured(featured);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  // Server-backed search (§5), debounced.
  React.useEffect(() => {
    if (demoMode) return;
    const trimmed = search.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      getClientCreatorRepository()
        .searchCreators(trimmed)
        .then((results) => {
          if (!cancelled) setSearchResults(results);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [demoMode, search]);

  const baseCreators = React.useMemo(
    () => (demoMode ? MOCK_CREATORS : remoteCreators ?? []),
    [demoMode, remoteCreators]
  );

  const visibleCreators = React.useMemo(
    () => filterByAdultAccess(baseCreators, adultAllowed),
    [baseCreators, adultAllowed]
  );

  const categories = React.useMemo(() => visibleCategories(adultAllowed), [adultAllowed]);

  // Restore search/category from this browser tab's session (not the URL)
  // once, on arrival — e.g. returning from a creator profile via back.
  React.useEffect(() => {
    if (!ready || !account) return;
    const stored = readDiscoverFilters();
    if (stored) {
      setSearch(stored.search);
      const isKnownCategory =
        stored.category === "All" || categories.includes(stored.category as Category);
      setCategory(isKnownCategory ? (stored.category as CategoryFilter) : "All");
    }
    setRecentSearches(readRecentSearches());
    setRestored(true);
    // Only run once filters can first be restored — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account]);

  React.useEffect(() => {
    if (!restored) return;
    writeDiscoverFilters({ search, category });
  }, [restored, search, category]);

  function commitSearch(term: string) {
    if (!term.trim()) return;
    addRecentSearch(term);
    setRecentSearches(readRecentSearches());
  }

  const filtered = React.useMemo(() => {
    if (!demoMode && search.trim()) {
      // Real mode with an active search: start from the server-ranked
      // results, then still apply the category/chip filters client-side.
      const base = filterByAdultAccess(searchResults ?? [], adultAllowed);
      const byCategory = filterByCategory(base, category);
      return filterChip ? applyFilterChip(byCategory, filterChip) : byCategory;
    }
    const byCategory = filterByCategory(visibleCreators, category);
    const bySearch = demoMode ? searchByUsername(byCategory, search) : byCategory;
    return filterChip ? applyFilterChip(bySearch, filterChip) : bySearch;
  }, [demoMode, search, searchResults, adultAllowed, visibleCreators, category, filterChip]);

  const isFiltering = search.trim().length > 0 || category !== "All" || filterChip !== null;
  const favoriteCreators = visibleCreators.filter((c) => favorites.includes(demoMode ? c.username : c.id));
  const featuredCreators = demoMode ? null : filterByAdultAccess(remoteFeatured ?? [], adultAllowed);

  if (!ready || !account) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/discover" user={{ name: account.username }} />

      <main className="container flex flex-col gap-10 py-10">
        <DiscoverHero
          displayName={account.username}
          visibleCategories={categories}
          activeCategory={category}
          onSelectCategory={setCategory}
        />

        <div className="flex flex-col gap-4">
          <DiscoverFilters
            search={search}
            onSearchChange={setSearch}
            onSearchCommit={commitSearch}
            categories={categories}
            activeCategory={category}
            onCategoryChange={setCategory}
            recentSearches={recentSearches}
          />
          <DiscoverFilterBar active={filterChip} onChange={setFilterChip} />
        </div>

        {!demoMode && loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-text-secondary">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading creators…</p>
          </div>
        ) : !demoMode && loadError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load creators"
            description="Something went wrong reaching the server. Check your connection and try again."
            action={
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        ) : isFiltering ? (
          <CreatorSection
            title="Results"
            creators={
              !demoMode && searching
                ? []
                : filterChip && ["lowest-price", "fast-reply", "highest-rated", "newest"].includes(filterChip)
                ? filtered
                : sortAllCreators(filtered)
            }
            emptyMessage={
              !demoMode && searching ? "Searching…" : "No creators found. Try a different search, category, or filter."
            }
            emptyAction={
              !searching && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                    setFilterChip(null);
                  }}
                >
                  Clear filters
                </Button>
              )
            }
            layout="grid"
          />
        ) : (
          <>
            {favoriteCreators.length > 0 && (
              <CreatorSection
                title="❤️ Your Favourites"
                description="Creators you've saved."
                creators={favoriteCreators}
                emptyMessage="No favourites yet."
                layout="row"
              />
            )}

            {demoMode ? (
              <>
                <CreatorSection
                  title="🔥 Trending"
                  description="Boosted and recently active creators."
                  creators={getTrendingCreators(visibleCreators).slice(0, 8)}
                  emptyMessage="No trending creators right now."
                  layout="row"
                />
                <CreatorSection
                  title="⚡ Fast Responders"
                  description="Typically reply within 10 minutes."
                  creators={getFastResponders(visibleCreators).slice(0, 8)}
                  emptyMessage="No fast responders right now."
                  layout="row"
                />
                <CreatorSection
                  title="🟢 Online Now"
                  creators={getOnlineNowCreators(visibleCreators)}
                  emptyMessage="No creators are online right now."
                  layout="row"
                />
                {allowRecommendations && (
                  <>
                    <CreatorSection
                      title="⭐ New Creators"
                      description="Recently joined Hush."
                      creators={getNewCreators(visibleCreators)}
                      emptyMessage="No new creators right now."
                      layout="row"
                    />
                    <CreatorSection
                      title="💎 Premium Picks"
                      description="Highest chat-access pricing."
                      creators={getPremiumPicks(visibleCreators).slice(0, 8)}
                      emptyMessage="No premium picks right now."
                      layout="row"
                    />
                    <CreatorSection
                      title="❤️ Most Returning Fans (Demo)"
                      description="Highest repeat-conversation count in this demo."
                      creators={getTrendingCreators(visibleCreators).slice(0, 8)}
                      emptyMessage="No data yet."
                      layout="row"
                    />
                    <CreatorSection
                      title="Sponsored"
                      description="Boosted creator placements."
                      creators={getSponsoredCreators(visibleCreators)}
                      emptyMessage="No sponsored creators right now."
                      layout="row"
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <CreatorSection
                  title="⭐ Featured Creators"
                  description="Ranked by returning fans, then completed conversations."
                  creators={featuredCreators ?? []}
                  emptyMessage="No featured creators yet."
                  layout="row"
                />
                <CreatorSection
                  title="🟢 Online Now"
                  creators={getOnlineNowCreators(visibleCreators)}
                  emptyMessage="No creators are online right now."
                  layout="row"
                />
                {allowRecommendations && (
                  <>
                    <CreatorSection
                      title="⭐ New Creators"
                      description="Recently joined Hush."
                      creators={getNewCreators(visibleCreators)}
                      emptyMessage="No new creators right now."
                      layout="row"
                    />
                    <CreatorSection
                      title="💎 Premium Picks"
                      description="Highest chat-access pricing."
                      creators={getPremiumPicks(visibleCreators).slice(0, 8)}
                      emptyMessage="No premium picks right now."
                      layout="row"
                    />
                  </>
                )}
              </>
            )}
            <CreatorSection
              title="All Creators"
              creators={sortAllCreators(visibleCreators)}
              emptyMessage="No creators found."
              emptyAction={
                !demoMode ? (
                  <p className="text-xs text-text-muted">
                    No approved creators yet — check back soon.
                  </p>
                ) : undefined
              }
              layout="grid"
            />
          </>
        )}
      </main>

      <BottomNav activeHref="/discover" />
    </div>
  );
}
