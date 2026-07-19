"use client";

import * as React from "react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DiscoverFilters } from "@/components/discover-filters";
import { CreatorSection } from "@/components/creator-section";
import { useRequireAccount } from "@/lib/use-account-guard";
import { hasAdultAccess } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import { readDiscoverFilters, writeDiscoverFilters } from "@/lib/discover-session";
import { getPrivacySettings } from "@/lib/preferences";
import type { Category } from "@/lib/categories";
import {
  filterByAdultAccess,
  filterByCategory,
  getNewCreators,
  getSponsoredCreators,
  searchByUsername,
  sortAllCreators,
  sortRecentlyActive,
  visibleCategories,
  type CategoryFilter,
} from "@/lib/discovery";

export default function DiscoverPage() {
  const { ready, account } = useRequireAccount();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("All");
  const [restored, setRestored] = React.useState(false);
  const [allowRecommendations] = React.useState(() => getPrivacySettings().allowCreatorRecommendations);

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
    setRestored(true);
    // Only run once filters can first be restored — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account]);

  React.useEffect(() => {
    if (!restored) return;
    writeDiscoverFilters({ search, category });
  }, [restored, search, category]);

  const filtered = React.useMemo(() => {
    const byCategory = filterByCategory(visibleCreators, category);
    return searchByUsername(byCategory, search);
  }, [visibleCreators, category, search]);

  const isFiltering = search.trim().length > 0 || category !== "All";

  if (!ready || !account) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/discover" user={{ name: account.username }} />

      <main className="container flex flex-col gap-10 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Discover</h1>
          <p className="max-w-2xl text-text-secondary">
            Browse creators and unlock 24-hour chat access, live photos, and live video.
          </p>
        </div>

        <DiscoverFilters
          search={search}
          onSearchChange={setSearch}
          categories={categories}
          activeCategory={category}
          onCategoryChange={setCategory}
        />

        {isFiltering ? (
          <CreatorSection
            title="Results"
            creators={sortAllCreators(filtered)}
            emptyMessage="No creators found. Try a different search or category."
            layout="grid"
          />
        ) : (
          <>
            <CreatorSection
              title="Recently Active"
              description="Online now, or active most recently."
              creators={sortRecentlyActive(visibleCreators).slice(0, 8)}
              emptyMessage="No creators are active right now."
              layout="row"
            />
            {allowRecommendations && (
              <>
                <CreatorSection
                  title="Sponsored"
                  description="Boosted creator placements."
                  creators={getSponsoredCreators(visibleCreators)}
                  emptyMessage="No sponsored creators right now."
                  layout="row"
                />
                <CreatorSection
                  title="New Creators"
                  description="Recently joined Hush."
                  creators={getNewCreators(visibleCreators)}
                  emptyMessage="No new creators right now."
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
