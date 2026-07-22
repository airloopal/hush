import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/auth/mode";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { supabasePaymentRepository } from "@/lib/repositories/supabase/payment-repository-server";

/**
 * GET /api/payments/status?id=<paymentId>
 *
 * Trusted status lookup for the return page's polling (§7). RLS
 * (payment_attempts_select_own_as_fan) already guarantees this can only
 * ever return a payment belonging to the caller — this route is a thin
 * wrapper, not an additional authorization boundary, but is still worth
 * keeping a dedicated authenticated check in front of for a clear 401
 * rather than an empty/ambiguous result.
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) {
    return NextResponse.json({ error: "Not available in demo mode." }, { status: 400 });
  }

  const paymentId = request.nextUrl.searchParams.get("id");
  if (!paymentId) {
    return NextResponse.json({ error: "Missing payment id." }, { status: 400 });
  }

  const currentUser = await getCurrentUserResult();
  if (currentUser.status !== "ok") {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const payment = await supabasePaymentRepository.getPayment(paymentId);
  if (!payment || payment.fanId !== currentUser.user.id) {
    // Same response whether it doesn't exist or belongs to someone else —
    // never confirm another user's payment exists.
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({
    status: payment.internalStatus,
    conversationId: payment.conversationId,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    failureReason: payment.failureReason,
  });
}
