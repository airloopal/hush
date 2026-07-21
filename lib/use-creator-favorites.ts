"use client";

import * as React from "react";
import { isDemoMode } from "@/lib/auth/mode";
import { useFavoriteCreators } from "@/lib/use-favorites";
import { toggleFavoriteCreator as toggleDemoFavorite } from "@/lib/favorites";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientCreatorRepository } from "@/lib/repositories/creator-repository-client";

export interface UseCreatorFavoritesResult {
  favorites: string[];
  /** Demo mode: keyed by username. Supabase mode: keyed by creator UUID. */
  toggleFavorite: (key: string) => void;
}

/**
 * Single hook FavoriteButton (and anything else showing favourite state)
 * should use. Demo mode behaves exactly as before this sprint (wraps the
 * existing localStorage-backed hook, unchanged). Supabase mode fetches
 * the signed-in fan's real favourites once, then updates optimistically
 * on toggle and rolls back if the write fails (§4).
 */
export function useCreatorFavorites(): UseCreatorFavoritesResult {
  const demoMode = isDemoMode();
  const demoFavorites = useFavoriteCreators(); // hooks must run unconditionally regardless of mode

  const [supaFavorites, setSupaFavorites] = React.useState<string[]>([]);
  const fanIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(async ({ data }) => {
        if (cancelled || !data.user) return;
        fanIdRef.current = data.user.id;
        try {
          const favs = await getClientCreatorRepository().getFavouriteCreators(data.user.id);
          if (!cancelled) setSupaFavorites(favs);
        } catch {
          // Leave favourites empty rather than surface an error for a
          // secondary, non-blocking piece of the page.
        }
      });
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  const toggleFavorite = React.useCallback(
    (key: string) => {
      if (demoMode) {
        toggleDemoFavorite(key);
        return;
      }
      const fanId = fanIdRef.current;
      if (!fanId) return;

      const wasFavorited = supaFavorites.includes(key);
      setSupaFavorites((prev) => (wasFavorited ? prev.filter((id) => id !== key) : [...prev, key]));

      const repo = getClientCreatorRepository();
      const request = wasFavorited ? repo.unfavouriteCreator(fanId, key) : repo.favouriteCreator(fanId, key);
      request.catch(() => {
        // Roll back the optimistic update on failure (§4).
        setSupaFavorites((prev) => (wasFavorited ? [...prev, key] : prev.filter((id) => id !== key)));
      });
    },
    [demoMode, supaFavorites]
  );

  return { favorites: demoMode ? demoFavorites : supaFavorites, toggleFavorite };
}
