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
 * Use on account-gated pages (/dashboard, /chats). Redirects to the start
 * of onboarding if no local account exists yet.
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
      router.replace("/onboarding/account-type");
      return;
    }
    setState({ ready: true, account });
  }, [router]);

  return state;
}
