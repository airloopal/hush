"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/ui/category-pill";
import { ADULT_CATEGORY } from "@/lib/categories";
import type { CategoryFilter } from "@/lib/discovery";
import type { Category } from "@/lib/categories";

export interface DiscoverFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  activeCategory: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
}

export function DiscoverFilters({
  search,
  onSearchChange,
  categories,
  activeCategory,
  onCategoryChange,
}: DiscoverFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by username"
          className="pl-9"
          aria-label="Search creators by username"
        />
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
