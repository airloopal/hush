"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useRequireAccount } from "@/lib/use-account-guard";

/**
 * "Conversations" is a first-class nav destination for creators, but the
 * actual conversation list already lives on /dashboard (built in earlier
 * stages) — this route intentionally doesn't duplicate that UI. It just
 * authenticates, then forwards there.
 */
export default function ConversationsPage() {
  const router = useRouter();
  const { ready, account } = useRequireAccount();

  React.useEffect(() => {
    if (ready && account) router.replace("/dashboard");
  }, [ready, account, router]);

  return null;
}
