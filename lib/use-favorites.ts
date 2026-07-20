"use client";

import * as React from "react";
import { FAVORITES_CHANGED_EVENT, getFavoriteCreators } from "@/lib/favorites";

export function useFavoriteCreators(): string[] {
  const [favorites, setFavorites] = React.useState<string[]>([]);

  React.useEffect(() => {
    function refresh() {
      setFavorites(getFavoriteCreators());
    }
    refresh();
    window.addEventListener(FAVORITES_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return favorites;
}
