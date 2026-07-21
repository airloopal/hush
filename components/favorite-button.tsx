"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreatorFavorites } from "@/lib/use-creator-favorites";
import { isDemoMode } from "@/lib/auth/mode";

export interface FavoriteButtonProps {
  /** Demo mode key. */
  username: string;
  /** Real creator UUID — required in Supabase mode (favourites are keyed
   * by creator_profiles.user_id there, not username), ignored in demo
   * mode. Falls back to `username` if omitted so existing demo call
   * sites don't need to change. */
  creatorId?: string;
  className?: string;
  size?: "sm" | "md";
}

/** Persisted locally in demo mode; a real, optimistically-updated
 * Supabase favourite in production mode (see lib/use-creator-favorites.ts).
 * Stops link/card click propagation so it works layered on top of a
 * clickable creator card. */
export function FavoriteButton({ username, creatorId, className, size = "md" }: FavoriteButtonProps) {
  const { favorites, toggleFavorite } = useCreatorFavorites();
  // Demo mode's favourites are always keyed by username, regardless of
  // whether a call site also passes creatorId — deciding this here (not
  // per call site) keeps it impossible to get wrong.
  const key = isDemoMode() ? username : (creatorId ?? username);
  const isFavorited = favorites.includes(key);
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
        toggleFavorite(key);
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
