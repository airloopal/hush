import { MOCK_CREATORS } from "@/lib/creators";
import { findCreatorByUsername } from "@/lib/discovery";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";

export const demoCreatorRepository: CreatorRepository = {
  async list() {
    return MOCK_CREATORS;
  },
  async getByUsername(username) {
    return findCreatorByUsername(MOCK_CREATORS, username) ?? null;
  },
};
