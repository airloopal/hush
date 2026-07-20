import type { MockCreator } from "@/lib/types";

/** Placeholder repository interface — Phase 2.1A foundation only. */
export interface CreatorRepository {
  list(): Promise<MockCreator[]>;
  getByUsername(username: string): Promise<MockCreator | null>;
}
