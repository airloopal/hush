import { readStorage, writeStorage } from "@/lib/storage";
import { generateId } from "@/lib/id";
import { MOCK_CREATORS } from "@/lib/creators";
import type { PaymentRepository, CreatePendingPaymentParams } from "@/lib/repositories/payment-repository";
import type { PaymentAttempt, FanPaymentRecord, CreatorPaymentSummaryRecord } from "@/lib/payment-types";

const DEMO_PAYMENTS_KEY = "hush:demo-payments";

function getAllDemoPayments(): PaymentAttempt[] {
  const raw = readStorage<PaymentAttempt[]>(DEMO_PAYMENTS_KEY);
  return Array.isArray(raw) ? raw : [];
}

function saveAllDemoPayments(payments: PaymentAttempt[]): void {
  writeStorage(DEMO_PAYMENTS_KEY, payments);
}

/** Demo mode's own isolated payment log — never shared with, or
 * confusable for, real Supabase payment_attempts rows (§11: "demo and
 * production payments must remain isolated"). Not exercised by the
 * existing demo unlock flow (UnlockChatModal continues to call
 * unlockChatSession directly in demo mode, unchanged) — this exists so
 * PaymentService itself can be exercised/tested in demo mode too. */
export const demoPaymentRepository: PaymentRepository = {
  async createPendingPayment(params: CreatePendingPaymentParams) {
    const existing = getAllDemoPayments().find(
      (p) => p.fanId === params.fanId && p.conversationId === params.conversationId && p.internalStatus === "paid"
    );
    if (existing) return existing;

    const creator = MOCK_CREATORS.find((c) => c.id === params.creatorId || c.username === params.creatorId);
    const amountMinor = Math.round(Number.parseFloat(creator?.chatPrice ?? "0") * 100);

    const payment: PaymentAttempt = {
      id: generateId("demo-payment"),
      fanId: params.fanId,
      creatorId: params.creatorId,
      conversationId: params.conversationId,
      amountMinor,
      currency: "USD",
      productType: "chat_day_pass",
      internalStatus: "paid", // demo checkout is instant, matching the existing demo unlock UX
      provider: "demo",
      providerReference: `demo_checkout_${params.clientIdempotencyKey}`,
      providerStatus: "demo_paid",
      paidAt: new Date().toISOString(),
      failureReason: null,
      activatedSessionId: null,
      createdAt: new Date().toISOString(),
    };
    saveAllDemoPayments([...getAllDemoPayments(), payment]);
    return payment;
  },

  async getPayment(id: string) {
    return getAllDemoPayments().find((p) => p.id === id) ?? null;
  },

  async getFanPaymentHistory(fanId: string): Promise<FanPaymentRecord[]> {
    return getAllDemoPayments()
      .filter((p) => p.fanId === fanId)
      .map((p) => ({
        id: p.id,
        creatorId: p.creatorId,
        conversationId: p.conversationId,
        amountMinor: p.amountMinor,
        currency: p.currency,
        productType: p.productType,
        internalStatus: p.internalStatus,
        providerReference: p.providerReference,
        paidAt: p.paidAt,
        failureReason: p.failureReason,
        createdAt: p.createdAt,
      }));
  },

  async getCreatorPaymentSummary(creatorId: string): Promise<CreatorPaymentSummaryRecord[]> {
    return getAllDemoPayments()
      .filter((p) => p.creatorId === creatorId)
      .map((p) => ({
        id: p.id,
        fanId: p.fanId,
        conversationId: p.conversationId,
        amountMinor: p.amountMinor,
        currency: p.currency,
        productType: p.productType,
        internalStatus: p.internalStatus,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      }));
  },
};
