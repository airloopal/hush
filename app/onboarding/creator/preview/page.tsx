"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Camera, Video } from "lucide-react";

import { OnboardingShell } from "@/components/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { useRedirectIfOnboarded } from "@/lib/use-account-guard";
import {
  clearOnboardingState,
  getOnboardingState,
  saveAccount,
} from "@/lib/account";
import { ADULT_CATEGORY, isAdultCategory } from "@/lib/categories";
import { isDemoMode } from "@/lib/auth/mode";
import { completeCreatorOnboardingSupabase } from "@/lib/auth/onboarding-sync";
import type { CreatorAccount, OnboardingDraft } from "@/lib/types";

export default function CreatorPreviewPage() {
  const router = useRouter();
  const { ready } = useRedirectIfOnboarded();
  const [draft, setDraft] = React.useState<OnboardingDraft | null>(null);

  React.useEffect(() => {
    if (!ready) return;
    const state = getOnboardingState();
    const d = state?.draft;
    const complete =
      d?.username && d.category && d.bio && d.chatPrice && d.photoPrice && d.videoPrice;
    if (!complete) {
      router.replace("/onboarding/creator");
      return;
    }
    setDraft(d ?? null);
  }, [ready, router]);

  const [pending, setPending] = React.useState(false);
  const [syncError, setSyncError] = React.useState(false);

  async function handleConfirm() {
    if (!draft?.username || !draft.category || !draft.bio) return;

    if (!isDemoMode()) {
      setSyncError(false);
      setPending(true);
      const ok = await completeCreatorOnboardingSupabase({
        username: draft.username,
        category: draft.category,
        bio: draft.bio,
        avatarDataUrl: draft.avatarDataUrl,
        chatPrice: draft.chatPrice ?? "0",
        photoPrice: draft.photoPrice ?? "0",
        videoPrice: draft.videoPrice ?? "0",
        adultConfirmed: draft.adultConfirmed ?? false,
      });
      setPending(false);
      if (!ok) {
        setSyncError(true);
        return;
      }
      clearOnboardingState();
      router.push("/dashboard");
      return;
    }

    const account: CreatorAccount = {
      role: "creator",
      username: draft.username,
      category: draft.category,
      bio: draft.bio,
      avatarDataUrl: draft.avatarDataUrl,
      pricing: {
        chatPrice: draft.chatPrice ?? "0",
        photoPrice: draft.photoPrice ?? "0",
        videoPrice: draft.videoPrice ?? "0",
      },
      isAdult: isAdultCategory(draft.category),
      adultConfirmed: draft.adultConfirmed ?? false,
      adultConfirmedAt: draft.adultConfirmed ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };
    saveAccount(account);
    clearOnboardingState();
    router.push("/dashboard");
  }

  if (!ready || !draft) return null;

  return (
    <OnboardingShell
      title="Preview your profile"
      description="This is how fans will see you in Discover. You can edit anything before finishing."
      backHref="/onboarding/creator"
      step={4}
      totalSteps={4}
    >
      <Card className="max-w-md">
        <CardHeader className="flex-row items-center gap-3">
          <Avatar src={draft.avatarDataUrl} alt={draft.username ?? "Preview"} size="lg" online />
          <div className="flex flex-1 flex-col">
            <span className="font-semibold leading-tight">@{draft.username}</span>
            <span className="text-sm text-text-secondary">Active now</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CategoryPill variant={draft.category === ADULT_CATEGORY ? "amber" : "neutral"}>
            {draft.category}
          </CategoryPill>
          <p className="text-sm text-text-secondary">{draft.bio}</p>
          <div className="flex flex-col divide-y divide-border rounded-md border border-border">
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-text-muted" />
                24-hour access · unlimited text
              </span>
              <span className="font-mono-data text-sm font-semibold">${draft.chatPrice}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4 text-text-muted" />
                Live photo
              </span>
              <span className="font-mono-data text-sm font-semibold">+${draft.photoPrice}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-text-muted" />
                Live video
              </span>
              <span className="font-mono-data text-sm font-semibold">+${draft.videoPrice}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {syncError && (
        <p className="text-xs text-danger" role="alert">
          Couldn&apos;t submit your creator profile. Check your connection and try again.
        </p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/onboarding/creator")} disabled={pending}>
          Edit
        </Button>
        <Button onClick={handleConfirm} isLoading={pending} disabled={pending}>
          Finish setup
        </Button>
      </div>
    </OnboardingShell>
  );
}
