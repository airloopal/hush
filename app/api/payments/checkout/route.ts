import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { isDemoMode } from "@/lib/auth/mode";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { getRepositories } from "@/lib/repositories/index";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPaymentService } from "@/lib/services/payment-service";
import { getPaymentProviderAdapter } from "@/lib/payments/provider";
import { supabasePaymentRepository } from "@/lib/repositories/supabase/payment-repository-server";
import { demoPaymentRepository } from "@/lib/repositories/demo/demo-payment-repository";

/**
 * POST /api/payments/checkout
 * Body:
 *   { creatorUsername: string }                                    — chat day pass
 *   { conversationId: string; mediaRequestType: "live_photo"|"live_video" } — Sprint L9
 *
 * Deliberately the only inputs trusted from the client are *which
 * creator/conversation* and, for media, *which type* — everything else
 * (price, approval, active session) is looked up or computed server-side.
 * See lib/services/payment-service.ts and create_media_request() (the
 * database function — migration 20260701000035) for the two respective
 * authorities.
 */
export async function POST(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: "Payments are not available in demo mode." }, { status: 400 });
  }

  let body: { creatorUsername?: string; conversationId?: string; mediaRequestType?: "live_photo" | "live_video" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const currentUser = await getCurrentUserResult();
  if (currentUser.status === "signed-out") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (currentUser.status !== "ok") {
    return NextResponse.json({ error: "Your account cannot make purchases right now." }, { status: 403 });
  }

  const origin = request.nextUrl.origin;
  const idempotencyKey = request.headers.get("x-idempotency-key") ?? randomUUID();

  // --- Sprint L9: live photo/video request checkout ------------------------
  if (body.mediaRequestType) {
    if (!body.conversationId) {
      return NextResponse.json({ error: "Missing conversation." }, { status: 400 });
    }
    const supabase = await createSupabaseServerClient();
    const { data: paymentAttemptId, error: rpcError } = await supabase.rpc("create_media_request", {
      p_conversation_id: body.conversationId,
      p_request_type: body.mediaRequestType,
    });
    if (rpcError || !paymentAttemptId) {
      return NextResponse.json({ error: "Couldn't start this request. Please try again." }, { status: 400 });
    }

    const { data: payment } = await supabase.from("payment_attempts").select("*").eq("id", paymentAttemptId).maybeSingle();
    if (!payment) {
      return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
    }

    try {
      const checkout = await getPaymentProviderAdapter().createCheckout({
        paymentAttemptId: payment.id,
        amountMinor: payment.amount_minor,
        currency: payment.currency,
        description: body.mediaRequestType === "live_photo" ? "Live photo request" : "Live video request",
        returnUrl: `${origin}/payments/return?payment=${payment.id}`,
        idempotencyKey,
      });
      return NextResponse.json({ checkoutUrl: checkout.checkoutUrl, paymentId: payment.id });
    } catch {
      return NextResponse.json({ error: "Couldn't start checkout. Please try again." }, { status: 502 });
    }
  }

  // --- Existing chat day pass checkout (Sprint L5), unchanged --------------
  if (!body.creatorUsername) {
    return NextResponse.json({ error: "Missing creator." }, { status: 400 });
  }

  const repositories = getRepositories();
  const creator = await repositories.creators.getCreatorByUsername(body.creatorUsername);

  let isBlocked = false;
  if (creator) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.rpc("is_blocked_pair", {
      p_user_a: currentUser.user.id,
      p_user_b: creator.id,
    });
    isBlocked = Boolean(data);
  }

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
    isBlocked,
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
