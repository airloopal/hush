"use client";

import {
  Gamepad2,
  Dumbbell,
  Music2,
  Palette,
  Shirt,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/categories";
import type { CategoryFilter } from "@/lib/discovery";

const QUICK_SHORTCUTS: { category: Category; icon: LucideIcon }[] = [
  { category: "Gaming", icon: Gamepad2 },
  { category: "Music", icon: Music2 },
  { category: "Fitness", icon: Dumbbell },
  { category: "Fashion", icon: Shirt },
  { category: "Art", icon: Palette },
];

export interface DiscoverHeroProps {
  displayName: string;
  visibleCategories: Category[];
  activeCategory: CategoryFilter;
  onSelectCategory: (category: CategoryFilter) => void;
}

export function DiscoverHero({ displayName, visibleCategories, activeCategory, onSelectCategory }: DiscoverHeroProps) {
  const shortcuts = QUICK_SHORTCUTS.filter((s) => visibleCategories.includes(s.category));

  return (
    <Reveal variant="fade" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {displayName}</h1>
        <p className="max-w-2xl text-text-secondary">
          Browse creators and unlock 24-hour chat access, live photos, and live video.
        </p>
      </div>

      {shortcuts.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {shortcuts.map(({ category, icon: Icon }) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => onSelectCategory(isActive ? "All" : category)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-1.5 rounded-lg border px-4 py-3 text-xs font-medium transition-[background-color,border-color,transform] duration-fast ease-signal hover:-translate-y-0.5",
                  isActive
                    ? "border-emerald/40 bg-emerald/10 text-emerald"
                    : "border-border bg-surface text-text-secondary hover:bg-surface-muted"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {category}
              </button>
            );
          })}
        </div>
      )}
    </Reveal>
  );
}
