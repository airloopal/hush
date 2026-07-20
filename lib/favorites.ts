import { readStorage, writeStorage } from "@/lib/storage";

const FAVORITES_KEY = "hush:favorite-creators";

/** Same-tab change event so any mounted favourite button/list updates live
 * without prop drilling or polling. */
export const FAVORITES_CHANGED_EVENT = "hush:favorites-changed";

function emitChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
  }
}

function readFavorites(): string[] {
  const raw = readStorage<unknown>(FAVORITES_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function writeFavorites(usernames: string[]): void {
  writeStorage(FAVORITES_KEY, usernames);
  emitChanged();
}

export function getFavoriteCreators(): string[] {
  return readFavorites();
}

export function isCreatorFavorited(username: string): boolean {
  return readFavorites().includes(username);
}

export function toggleFavoriteCreator(username: string): boolean {
  const current = readFavorites();
  const isFavorited = current.includes(username);
  writeFavorites(isFavorited ? current.filter((u) => u !== username) : [...current, username]);
  return !isFavorited;
}
