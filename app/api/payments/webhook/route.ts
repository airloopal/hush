import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { processPaymentWebhook } from "@/lib/payments/webhook-handler";
import { getPaymentProviderAdapter } from "@/lib/payments/provider";

/**
 * POST /api/payments/webhook
 *
 * `request.text()` reads the exact, unparsed body — required because
 * signature schemes typically sign the raw bytes, not a re-serialized
 * JSON object (see the note on PaymentProviderAdapter.verifyWebhookSignature).
 * Never do `request.json()` first here.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const adapter = getPaymentProviderAdapter();

  const outcome = await processPaymentWebhook(rawBody, request.headers, adapter);

  if (!outcome.ok) {
    // Never expose *why* verification failed beyond a generic rejection —
    // §4/§16, and never leak whether it failed due to a bad signature vs.
    // a database error (that distinction is only useful to an attacker
    // probing the endpoint).
    return NextResponse.json({ error: "Webhook rejected." }, { status: outcome.reason === "invalid-signature" ? 401 : 500 });
  }

  // Always 200 for anything the signature check accepted — including
  // "already processed" and "unrecognized payment" — so the provider
  // doesn't endlessly retry a delivery Hush has already handled or never
  // will recognize.
  return NextResponse.json({ received: true });
}
