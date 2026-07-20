import type { ProfileRepository } from "@/lib/repositories/profile-repository";
import type { Account } from "@/lib/types";

/**
 * Placeholder service boundary — Phase 2.1A foundation only.
 *
 * Services sit above repositories and hold business logic (validation,
 * authorization, cross-repository orchestration) that doesn't belong in a
 * thin data-access repository. Nothing in the app constructs or calls this
 * yet — today's pages call the existing lib/account.ts functions directly,
 * unchanged. This class exists so that logic has an obvious home once it's
 * actually needed.
 */
export class ProfileService {
  constructor(private readonly profiles: ProfileRepository) {}

  async getProfile(username: string): Promise<Account | null> {
    return this.profiles.getByUsername(username);
  }

  async saveProfile(account: Account): Promise<void> {
    // Future home for validation/authorization before writing.
    await this.profiles.upsert(account);
  }
}
