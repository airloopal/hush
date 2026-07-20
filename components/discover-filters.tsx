"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/ui/category-pill";
import { ADULT_CATEGORY } from "@/lib/categories";
import type { CategoryFilter } from "@/lib/discovery";
import type { Category } from "@/lib/categories";

export interface DiscoverFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchCommit?: (value: string) => void;
  categories: Category[];
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  recentSearches?: string[];
}

export function DiscoverFilters({
  search,
  onSearchChange,
  onSearchCommit,
  categories,
  activeCategory,
  onCategoryChange,
  recentSearches = [],
}: DiscoverFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onBlur={() => onSearchCommit?.(search)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchCommit?.(search);
            }}
            placeholder="Search creators, usernames or categories"
            className="pl-9 pr-9"
            aria-label="Search creators, usernames or categories"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors duration-fast ease-signal hover:bg-surface-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!search && recentSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-text-muted">Recent:</span>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  onSearchChange(term);
                  onSearchCommit?.(term);
                }}
                className="rounded-pill bg-surface-muted px-2.5 py-1 text-xs text-text-secondary transition-colors duration-fast ease-signal hover:bg-surface-muted/70 hover:text-text-primary"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryPill
          variant="neutral"
          selected={activeCategory === "All"}
          onClick={() => onCategoryChange("All")}
        >
          All
        </CategoryPill>
        {categories.map((category) => (
          <CategoryPill
            key={category}
            variant={category === ADULT_CATEGORY ? "amber" : "neutral"}
            selected={activeCategory === category}
            onClick={() => onCategoryChange(category)}
          >
            {category}
          </CategoryPill>
        ))}
      </div>
    </div>
  );
}
