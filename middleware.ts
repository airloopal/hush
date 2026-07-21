import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, requireSupabasePublicEnv } from "@/lib/supabase/env";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

// Exact-match public routes. Dynamic public routes (if any are added later,
// e.g. public creator profiles) should use a prefix check alongside this.
const PUBLIC_ROUTES = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/safety",
  "/design-system",
]);

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  // Next.js internals / static assets — never gated.
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true;
  // /dev/* (e.g. the go-live diagnostics page) enforces its own, more
  // precise dev-mode-or-admin check — see app/dev/diagnostics/page.tsx.
  // Gating it here too would incorrectly force a login even for a
  // developer just checking whether Supabase is configured at all.
  if (pathname.startsWith("/dev/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  // Demo mode: middleware is a complete no-op. Route protection continues
  // to be handled exactly as before, client-side, by useRequireAccount /
  // useRequireRole (lib/use-account-guard.ts) — untouched by this file.
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const env = requireSupabasePublicEnv();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session (rotates the token if needed) — this call is
  // required for SSR session persistence to work at all with @supabase/ssr.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeRedirectPath(`${pathname}${search}`, "/discover") ?? "/discover");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets — the isPublicPath()/
     * isSupabaseConfigured() checks above do the real filtering.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
