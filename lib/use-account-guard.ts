"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getAccount, homeRouteForAccount } from "@/lib/account";
import type { Account } from "@/lib/types";

/**
 * Use on every /onboarding/* page. If onboarding was already completed,
 * bounce the visitor to their role's home route instead of letting them
 * re-run onboarding. Returns `ready` so the page can avoid rendering a
 * flash of onboarding UI before the check finishes.
 */
export function useRedirectIfOnboarded(): { ready: boolean } {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const account = getAccount();
    if (account) {
      router.replace(homeRouteForAccount(account));
      return;
    }
    setReady(true);
  }, [router]);

  return { ready };
}

/**
 * Use on account-gated pages (/dashboard, /discover, /chats, etc). Redirects
 * to /login if no local account/demo session exists yet.
 *
 * NOTE (Stage 5A.2): this used to redirect into /onboarding/account-type.
 * Demo login (see lib/demo-auth.ts) is now the front door — it seeds this
 * same hush:account record via its bridge, so this hook's contract to
 * existing pages is unchanged; only the redirect target moved. A real
 * production auth integration would replace the `getAccount()` check below
 * with a real session check.
 */
export function useRequireAccount(): { ready: boolean; account: Account | null } {
  const router = useRouter();
  const [state, setState] = React.useState<{ ready: boolean; account: Account | null }>({
    ready: false,
    account: null,
  });

  React.useEffect(() => {
    const account = getAccount();
    if (!account) {
      router.replace("/login");
      return;
    }
    setState({ ready: true, account });
  }, [router]);

  return state;
}

/**
 * Same as useRequireAccount, but additionally redirects a signed-in account
 * of the wrong role to their own home route — e.g. a creator landing on
 * /discover gets sent to /dashboard instead. Used only by the small set of
 * pages that are genuinely role-specific (Discover, the fan chat list,
 * Dashboard); shared pages (Settings, Notifications, per-conversation chat)
 * intentionally keep using the plain useRequireAccount above.
 */
export function useRequireRole(role: "fan" | "creator"): { ready: boolean; account: Account | null } {
  const router = useRouter();
  const { ready, account } = useRequireAccount();

  React.useEffect(() => {
    if (ready && account && account.role !== role) {
      router.replace(homeRouteForAccount(account));
    }
  }, [ready, account, role, router]);

  const roleMatches = !!account && account.role === role;
  return { ready: ready && roleMatches, account: roleMatches ? account : null };
}
