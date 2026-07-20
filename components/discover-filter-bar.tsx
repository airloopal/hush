"use client";

import { CategoryPill } from "@/components/ui/category-pill";
import type { CreatorFilterChip } from "@/lib/discovery";

const FILTER_CHIPS: { value: CreatorFilterChip; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "available-today", label: "Available Today" },
  { value: "fast-reply", label: "Fast Reply" },
  { value: "lowest-price", label: "Lowest Price" },
  { value: "highest-rated", label: "Highest Rated (Demo)" },
  { value: "newest", label: "Newest" },
];

export interface DiscoverFilterBarProps {
  active: CreatorFilterChip | null;
  onChange: (chip: CreatorFilterChip | null) => void;
}

export function DiscoverFilterBar({ active, onChange }: DiscoverFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Sort and filter creators">
      {FILTER_CHIPS.map((chip) => (
        <CategoryPill
          key={chip.value}
          variant="neutral"
          selected={active === chip.value}
          onClick={() => onChange(active === chip.value ? null : chip.value)}
        >
          {chip.label}
        </CategoryPill>
      ))}
    </div>
  );
}
