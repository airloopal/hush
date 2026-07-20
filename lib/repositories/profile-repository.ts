import type { Account } from "@/lib/types";

/**
 * Placeholder repository interface — Phase 2.1A foundation only. Method
 * shapes are async because a real Supabase-backed implementation will be;
 * the demo implementation just wraps today's synchronous localStorage
 * calls in a resolved Promise so both can satisfy this same interface.
 */
export interface ProfileRepository {
  getByUsername(username: string): Promise<Account | null>;
  upsert(account: Account): Promise<void>;
}
