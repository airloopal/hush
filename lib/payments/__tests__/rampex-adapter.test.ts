import { describe, expect, it } from "vitest";
import { rampexAdapter } from "@/lib/payments/providers/rampex-adapter";

describe("rampexAdapter (placeholder — must never silently succeed)", () => {
  it("verifyWebhookSignature always returns invalid", () => {
    const result = rampexAdapter.verifyWebhookSignature("{}", new Headers());
    expect(result.valid).toBe(false);
  });

  it("verifyWebhookSignature returns invalid even with headers that look plausible", () => {
    const headers = new Headers({ "x-signature": "sig_looks_real", "x-webhook-id": "evt_123" });
    const result = rampexAdapter.verifyWebhookSignature('{"status":"paid"}', headers);
    expect(result.valid).toBe(false);
  });

  it("createCheckout throws rather than returning a fabricated checkout URL", async () => {
    await expect(
      rampexAdapter.createCheckout({
        paymentAttemptId: "test",
        amountMinor: 1500,
        currency: "USD",
        description: "test",
        returnUrl: "https://example.com/return",
        idempotencyKey: "test-key",
      })
    ).rejects.toThrow();
  });

  it("parseWebhookEvent throws rather than returning fabricated event data", () => {
    expect(() => rampexAdapter.parseWebhookEvent('{"status":"paid"}')).toThrow();
  });

  it("has a distinct, non-empty provider name", () => {
    expect(rampexAdapter.providerName).toBe("rampex");
  });
});
