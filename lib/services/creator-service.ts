import type { CreatorRepository } from "@/lib/repositories/creator-repository";
import type { MockCreator } from "@/lib/types";

/** Placeholder service boundary — Phase 2.1A foundation only. See
 * lib/services/profile-service.ts for the pattern this follows. */
export class CreatorService {
  constructor(private readonly creators: CreatorRepository) {}

  async listCreators(): Promise<MockCreator[]> {
    return this.creators.list();
  }

  async getCreator(username: string): Promise<MockCreator | null> {
    return this.creators.getByUsername(username);
  }
}
