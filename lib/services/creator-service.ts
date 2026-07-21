import type { CreatorRepository } from "@/lib/repositories/creator-repository";
import type { DiscoverCreator } from "@/lib/discover-types";

/** Placeholder service boundary — see lib/services/profile-service.ts for
 * the pattern this follows. Method names track the repository's
 * Launch-Sprint-L2 interface (lib/repositories/creator-repository.ts). */
export class CreatorService {
  constructor(private readonly creators: CreatorRepository) {}

  async listApprovedCreators(): Promise<DiscoverCreator[]> {
    return this.creators.getApprovedCreators();
  }

  async getCreator(username: string): Promise<DiscoverCreator | null> {
    return this.creators.getCreatorByUsername(username);
  }
}
