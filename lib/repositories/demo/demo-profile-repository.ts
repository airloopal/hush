import { getAccount, saveAccount } from "@/lib/account";
import type { Account } from "@/lib/types";
import type { ProfileRepository } from "@/lib/repositories/profile-repository";

function notAvailableInDemoMode(name: string): never {
  throw new Error(
    `${name} has no demo-mode equivalent — it operates on the real Postgres schema (see lib/supabase/database.types.ts), which the local demo doesn't have. This repository isn't called from any page yet.`
  );
}

/** Wraps the existing local/demo storage functions so the app's current
 * behavior is unchanged — this is the repository the factory returns
 * today, and it's already what every page effectively uses. */
export const demoProfileRepository: ProfileRepository = {
  async getByUsername(username) {
    const account = getAccount();
    return account && account.username === username ? account : null;
  },
  async upsert(account: Account) {
    saveAccount(account);
  },

  async getById() {
    notAvailableInDemoMode("ProfileRepository.getById");
  },
  async updateOwnProfile() {
    notAvailableInDemoMode("ProfileRepository.updateOwnProfile");
  },
};
