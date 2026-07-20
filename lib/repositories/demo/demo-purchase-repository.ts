import { getAllMediaPurchasesForFan, getAllSessionsForCreator, getMediaPurchasesForSession } from "@/lib/chat";
import type { PurchaseRepository } from "@/lib/repositories/purchase-repository";

export const demoPurchaseRepository: PurchaseRepository = {
  async listForFan(fanUsername) {
    return getAllMediaPurchasesForFan(fanUsername);
  },
  async listForCreator(creatorUsername) {
    const sessions = getAllSessionsForCreator(creatorUsername);
    return sessions.flatMap((session) => getMediaPurchasesForSession(session.id));
  },
};
