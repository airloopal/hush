"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { requireSession, homeRouteForRole } from "@/lib/demo-auth";
import type { DemoUser } from "@/lib/demo-auth-types";

/** Guards a page/component against the demo session rather than the legacy
 * account record directly. Most existing protected pages still use
 * useRequireAccount() (see lib/use-account-guard.ts), which is kept in
 * sync via lib/demo-auth.ts's bridge — this hook is for new, session-aware
 * UI (e.g. the account menu) that needs the DemoUser shape itself. */
export function useRequireSession(): { ready: boolean; user: DemoUser | null } {
  const router = useRouter();
  const [state, setState] = React.useState<{ ready: boolean; user: DemoUser | null }>({
    ready: false,
    user: null,
  });

  React.useEffect(() => {
    const user = requireSession();
    if (!user) {
      router.replace("/login");
      return;
    }
    setState({ ready: true, user });
  }, [router]);

  return state;
}

/** Non-redirecting variant for UI that should render differently for
 * signed-in vs. signed-out visitors without forcing a redirect (e.g. the
 * shared header). */
export function useCurrentDemoUser(): DemoUser | null {
  const [user, setUser] = React.useState<DemoUser | null>(null);

  React.useEffect(() => {
    setUser(requireSession());
  }, []);

  return user;
}

/** Use on /login. If a demo session already exists, skip the login form
 * and go straight to that role's home route. */
export function useRedirectIfSignedIn(): { ready: boolean } {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const user = requireSession();
    if (user) {
      router.replace(homeRouteForRole(user.role));
      return;
    }
    setReady(true);
  }, [router]);

  return { ready };
}
