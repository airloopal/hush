/** Local-only id generator — not a real database key. Reused across all
 * domain helpers (chat sessions/messages, reports, payment issues, etc.)
 * so there's a single implementation instead of copies drifting apart. */
export function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
