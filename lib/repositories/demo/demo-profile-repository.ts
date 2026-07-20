import { getAccount, saveAccount } from "@/lib/account";
import type { Account } from "@/lib/types";
import type { ProfileRepository } from "@/lib/repositories/profile-repository";

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
};
