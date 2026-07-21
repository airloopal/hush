"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/components/onboarding-shell";
import { Button } from "@/components/ui/button";
import { CategoryPill } from "@/components/ui/category-pill";
import { Card, CardContent } from "@/components/ui/card";
import { useRedirectIfOnboarded } from "@/lib/use-account-guard";
import { clearOnboardingState, getOnboardingState, saveAccount } from "@/lib/account";
import { ADULT_CATEGORY, CATEGORIES, type Category } from "@/lib/categories";
import { isDemoMode } from "@/lib/auth/mode";
import { completeFanOnboardingSupabase } from "@/lib/auth/onboarding-sync";
import type { FanAccount } from "@/lib/types";

export default function FanInterestsPage() {
  const router = useRouter();
  const { ready } = useRedirectIfOnboarded();
  const [username, setUsername] = React.useState<string | null>(null);
  const [interests, setInterests] = React.useState<Category[]>([]);
  const [adultConfirmed, setAdultConfirmed] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (!ready) return;
    const state = getOnboardingState();
    if (!state?.draft.username) {
      router.replace("/onboarding/username");
      return;
    }
    setUsername(state.draft.username);
    setInterests(state.draft.interests ?? []);
    setAdultConfirmed(state.draft.adultConfirmed ?? false);
  }, [ready, router]);

  function toggleInterest(category: Category) {
    setInterests((current) =>
      current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category]
    );
    if (category === ADULT_CATEGORY) setSubmitted(false);
  }

  const wantsAdult = interests.includes(ADULT_CATEGORY);
  const canContinue = interests.length > 0 && (!wantsAdult || adultConfirmed);
  const [pending, setPending] = React.useState(false);
  const [syncError, setSyncError] = React.useState(false);

  async function handleContinue() {
    setSubmitted(true);
    if (!username || !canContinue) return;

    if (!isDemoMode()) {
      setSyncError(false);
      setPending(true);
      const ok = await completeFanOnboardingSupabase({
        username,
        interests,
        adultConfirmed: wantsAdult ? adultConfirmed : false,
      });
      setPending(false);
      if (!ok) {
        setSyncError(true);
        return; // Stays on the page — a recoverable, visible failure rather than a silent one.
      }
      clearOnboardingState();
      router.push("/discover");
      return;
    }

    const account: FanAccount = {
      role: "fan",
      username,
      interests,
      adultConfirmed: wantsAdult ? adultConfirmed : false,
      adultConfirmedAt: wantsAdult && adultConfirmed ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };
    saveAccount(account);
    clearOnboardingState();
    router.push("/discover");
  }

  if (!ready || !username) return null;

  return (
    <OnboardingShell
      title="What are you into?"
      description="Pick a few interests — this shapes what Discover shows you first."
      backHref="/onboarding/username"
      step={3}
      totalSteps={3}
    >
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <CategoryPill
            key={category}
            variant={category === ADULT_CATEGORY ? "amber" : "neutral"}
            selected={interests.includes(category)}
            onClick={() => toggleInterest(category)}
          >
            {category}
          </CategoryPill>
        ))}
      </div>
      {submitted && interests.length === 0 && (
        <p className="text-xs text-danger">Pick at least one interest to continue.</p>
      )}

      {wantsAdult && (
        <Card className="border-amber/30 bg-amber/5">
          <CardContent className="flex flex-col gap-3 p-4">
            <p className="text-sm font-medium text-text-primary">Adult 18+ content confirmation</p>
            <p className="text-sm text-text-secondary">
              You selected Adult 18+. Confirm you are 18 years or older and want to see lawful
              adult creators in Discover.
            </p>
            <label className="flex items-start gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                checked={adultConfirmed}
                onChange={(event) => setAdultConfirmed(event.target.checked)}
              />
              I confirm I am 18 years or older and want to see Adult 18+ creators.
            </label>
            {submitted && !adultConfirmed && (
              <p className="text-xs text-danger">Confirmation is required to include Adult 18+.</p>
            )}
          </CardContent>
        </Card>
      )}

      {syncError && (
        <p className="text-xs text-danger" role="alert">
          Couldn&apos;t save your profile. Check your connection and try again.
        </p>
      )}

      <Button onClick={handleContinue} isLoading={pending} disabled={pending}>
        Finish setup
      </Button>
    </OnboardingShell>
  );
}
