export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  "admin", "administrator", "root", "system", "support", "help",
  "api", "www", "hush", "official", "moderator", "mod", "staff",
  "security", "billing", "payments", "legal", "abuse", "null", "undefined",
  "settings", "notifications", "discover", "dashboard", "login", "logout",
  "signup", "signin", "onboarding", "chats", "creators", "safety",
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}
