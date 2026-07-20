"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoriteCreator } from "@/lib/favorites";
import { useFavoriteCreators } from "@/lib/use-favorites";

export interface FavoriteButtonProps {
  username: string;
  className?: string;
  size?: "sm" | "md";
}

/** UI-only — persisted locally, no backend. Stops link/card click
 * propagation so it works layered on top of a clickable creator card. */
export function FavoriteButton({ username, className, size = "md" }: FavoriteButtonProps) {
  const favorites = useFavoriteCreators();
  const isFavorited = favorites.includes(username);
  const dimension = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      type="button"
      aria-label={isFavorited ? `Remove ${username} from favourites` : `Add ${username} to favourites`}
      aria-pressed={isFavorited}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavoriteCreator(username);
      }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-surface/90 backdrop-blur transition-[transform,background-color,border-color] duration-fast ease-signal hover:border-danger/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90",
        dimension,
        className
      )}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-[transform,color] duration-fast ease-signal",
          isFavorited ? "scale-110 fill-danger text-danger" : "text-text-muted"
        )}
      />
    </button>
  );
}
