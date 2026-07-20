import type { PurchaseRepository } from "@/lib/repositories/purchase-repository";
import type { MediaPurchase } from "@/lib/chat-types";

/** Placeholder service boundary — Phase 2.1A foundation only. Future home
 * for checkout/payment orchestration — explicitly not implemented in this
 * phase (no payments integration yet). */
export class PurchaseService {
  constructor(private readonly purchases: PurchaseRepository) {}

  async getPurchasesForFan(fanUsername: string): Promise<MediaPurchase[]> {
    return this.purchases.listForFan(fanUsername);
  }

  async getPurchasesForCreator(creatorUsername: string): Promise<MediaPurchase[]> {
    return this.purchases.listForCreator(creatorUsername);
  }
}
