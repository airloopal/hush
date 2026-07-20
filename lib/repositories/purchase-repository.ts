import type { MediaPurchase } from "@/lib/chat-types";

/** Placeholder repository interface — Phase 2.1A foundation only. */
export interface PurchaseRepository {
  listForFan(fanUsername: string): Promise<MediaPurchase[]>;
  listForCreator(creatorUsername: string): Promise<MediaPurchase[]>;
}
