"use client";

import * as React from "react";
import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { DiscoverHero } from "@/components/discover-hero";
import { DiscoverFilters } from "@/components/discover-filters";
import { DiscoverFilterBar } from "@/components/discover-filter-bar";
import { CreatorSection } from "@/components/creator-section";
import { useRequireRole } from "@/lib/use-account-guard";
import { hasAdultAccess } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import {
  addRecentSearch,
  readDiscoverFilters,
  readRecentSearches,
  writeDiscoverFilters,
} from "@/lib/discover-session";
import { getPrivacySettings } from "@/lib/preferences";
import { useFavoriteCreators } from "@/lib/use-favorites";
import type { Category } from "@/lib/categories";
import {
  applyFilterChip,
  filterByAdultAccess,
  filterByCategory,
  getFastResponders,
  getMostReturningFansDemo,
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

export default function DiscoverPage() {
  const { ready, account } = useRequireRole("fan");
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("All");
  const [filterChip, setFilterChip] = React.useState<CreatorFilterChip | null>(null);
  const [restored, setRestored] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
  const [allowRecommendations] = React.useState(() => getPrivacySettings().allowCreatorRecommendations);
  const favorites = useFavoriteCreators();

  const adultAllowed = hasAdultAccess(account);

  const visibleCreators = React.useMemo(
    () => filterByAdultAccess(MOCK_CREATORS, adultAllowed),
    [adultAllowed]
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
    const byCategory = filterByCategory(visibleCreators, category);
    const bySearch = searchByUsername(byCategory, search);
    return filterChip ? applyFilterChip(bySearch, filterChip) : bySearch;
  }, [visibleCreators, category, search, filterChip]);

  const isFiltering = search.trim().length > 0 || category !== "All" || filterChip !== null;
  const favoriteCreators = visibleCreators.filter((c) => favorites.includes(c.username));

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

        {isFiltering ? (
          <CreatorSection
            title="Results"
            creators={
              filterChip && ["lowest-price", "fast-reply", "highest-rated", "newest"].includes(filterChip)
                ? filtered
                : sortAllCreators(filtered)
            }
            emptyMessage="No creators found. Try a different search, category, or filter."
            emptyAction={
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
                  creators={getMostReturningFansDemo(visibleCreators).slice(0, 8)}
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
            <CreatorSection
              title="All Creators"
              creators={sortAllCreators(visibleCreators)}
              emptyMessage="No creators found."
              layout="grid"
            />
          </>
        )}
      </main>

      <BottomNav activeHref="/discover" />
    </div>
  );
}
