import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { supabaseProfileRepository } from "@/lib/repositories/index";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    // Expired, already-used, or malformed link.
    return NextResponse.redirect(`${origin}/login?error=expired-link`);
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=expired-link`);
  }

  // A password-recovery link routes to /reset-password regardless of
  // profile/onboarding state — the user isn't trying to "use the app,"
  // they're trying to set a new password.
  if (next === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  const profile = await supabaseProfileRepository.getById(data.user.id);

  if (!profile) {
    // handle_new_user() should always have created this — if it's
    // missing, fail safely rather than guessing.
    return NextResponse.redirect(`${origin}/login?error=missing-profile`);
  }

  if (profile.status !== "active") {
    return NextResponse.redirect(`${origin}/login?error=account-blocked`);
  }

  if (!profile.onboarding_completed) {
    return NextResponse.redirect(`${origin}/onboarding/account-type`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const destination = profile.role === "creator" ? "/dashboard" : "/discover";
  return NextResponse.redirect(`${origin}${destination}`);
}
