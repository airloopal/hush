import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { isDemoMode } from "@/lib/auth/mode";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { getRepositories } from "@/lib/repositories/index";
import { createPaymentService } from "@/lib/services/payment-service";
import { getPaymentProviderAdapter } from "@/lib/payments/provider";
import { supabasePaymentRepository } from "@/lib/repositories/supabase/payment-repository-server";
import { demoPaymentRepository } from "@/lib/repositories/demo/demo-payment-repository";

/**
 * POST /api/payments/checkout
 * Body: { creatorUsername: string }
 *
 * Deliberately the ONLY input trusted from the client is *which creator*
 * — everything else (whether the fan is active, whether the creator is
 * approved, the price, the amount) is looked up or computed here, never
 * accepted from the request body. See lib/services/payment-service.ts.
 */
export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: "Payments are not available in demo mode." }, { status: 400 });
  }

  let body: { creatorUsername?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.creatorUsername) {
    return NextResponse.json({ error: "Missing creator." }, { status: 400 });
  }

  const currentUser = await getCurrentUserResult();
  if (currentUser.status === "signed-out") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (currentUser.status !== "ok") {
    return NextResponse.json({ error: "Your account cannot make purchases right now." }, { status: 403 });
  }

  const repositories = getRepositories();
  const creator = await repositories.creators.getCreatorByUsername(body.creatorUsername);
  // getCreatorByUsername only ever returns approved+active creators (it
  // reads through public.public_creator_profiles) — a non-null result IS
  // the approval check.

  const idempotencyKey = request.headers.get("x-idempotency-key") ?? randomUUID();
  const origin = request.nextUrl.origin;

  const paymentService = createPaymentService(
    isDemoMode() ? demoPaymentRepository : supabasePaymentRepository,
    repositories.conversations,
    getPaymentProviderAdapter()
  );

  const result = await paymentService.createCheckout({
    fanId: currentUser.user.id,
    fanAccountActive: currentUser.user.profile.status === "active",
    creatorId: creator?.id ?? null,
    creatorApproved: Boolean(creator),
    clientIdempotencyKey: idempotencyKey,
    returnUrl: `${origin}/payments/return`,
  });

  if (!result.ok) {
    const status = result.reason === "unauthenticated" ? 401 : result.reason ? 403 : 502;
    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again.", reason: result.reason ?? "unknown" },
      { status }
    );
  }

  return NextResponse.json({ checkoutUrl: result.checkoutUrl ?? null, paymentId: result.paymentId });
}
