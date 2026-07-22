"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/lib/use-account-guard";

type PollState = "loading" | "pending" | "processing" | "paid" | "failed" | "cancelled" | "expired" | "error";

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 40; // ~100 seconds of polling before giving up

function PaymentReturnContent() {
  const { ready, account } = useRequireRole("fan");
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment");

  const [state, setState] = React.useState<PollState>("loading");
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const attemptsRef = React.useRef(0);

  React.useEffect(() => {
    if (!ready || !account || !paymentId) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/payments/status?id=${encodeURIComponent(paymentId!)}`);
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          return;
        }
        const data = await res.json();
        setConversationId(data.conversationId ?? null);

        if (data.status === "paid") {
          setState("paid");
          return;
        }
        if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") {
          setState(data.status);
          return;
        }

        attemptsRef.current += 1;
        setState(attemptsRef.current > 3 ? "processing" : "pending");
        if (attemptsRef.current < MAX_POLL_ATTEMPTS) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          setState("processing");
        }
      } catch {
        if (!cancelled) setState("error");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, account, paymentId]);

  if (!ready || !account) return null;

  if (!paymentId) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No payment to check"
        description="This page is only meaningful after returning from checkout."
        action={
          <Button variant="outline" asChild>
            <Link href="/discover">Back to Discover</Link>
          </Button>
        }
      />
    );
  }

  if (state === "loading" || state === "pending" || state === "processing") {
    return (
      <EmptyState
        icon={Loader2}
        title={state === "processing" ? "Still confirming your payment" : "Confirming your payment"}
        description={
          state === "processing"
            ? "This is taking longer than usual. Your payment may still complete — we'll activate access automatically the moment it does. It's safe to leave this page."
            : "Hang tight — we're verifying your payment with the provider. This usually only takes a few seconds."
        }
      />
    );
  }

  if (state === "paid") {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Payment confirmed"
        description="24-hour chat access is now active."
        action={<Button onClick={() => conversationId && router.push(`/chats`)}>Go to chat</Button>}
      />
    );
  }

  if (state === "cancelled") {
    return (
      <EmptyState
        icon={XCircle}
        title="Checkout cancelled"
        description="No charge was made. You can try again whenever you're ready."
        action={
          <Button variant="outline" asChild>
            <Link href="/discover">Back to Discover</Link>
          </Button>
        }
      />
    );
  }

  if (state === "expired") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Checkout expired"
        description="This checkout link is no longer valid. Start a new one from the creator's profile."
        action={
          <Button variant="outline" asChild>
            <Link href="/discover">Back to Discover</Link>
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState
      icon={AlertTriangle}
      title="We couldn't confirm this payment"
      description="Something went wrong. If you were charged, it will be refunded automatically — no action is needed. You can try again."
      action={
        <Button variant="outline" asChild>
          <Link href="/discover">Back to Discover</Link>
        </Button>
      }
    />
  );
}

export default function PaymentReturnPage() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/discover" />
      <main className="container flex flex-col items-center justify-center gap-6 py-16">
        <React.Suspense fallback={null}>
          <PaymentReturnContent />
        </React.Suspense>
      </main>
      <BottomNav activeHref="/discover" />
    </div>
  );
}
