"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { OnboardingShell } from "@/components/onboarding-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRedirectIfOnboarded } from "@/lib/use-account-guard";
import { getOnboardingState, updateOnboardingDraft } from "@/lib/account";
import { validateUsername } from "@/lib/validation";

export default function UsernamePage() {
  const router = useRouter();
  const { ready } = useRedirectIfOnboarded();
  const [role, setRole] = React.useState<"fan" | "creator" | null>(null);
  const [username, setUsername] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (!ready) return;
    const state = getOnboardingState();
    if (!state?.draft.role) {
      router.replace("/onboarding/account-type");
      return;
    }
    setRole(state.draft.role);
    setUsername(state.draft.username ?? "");
  }, [ready, router]);

  const validation = validateUsername(username);

  function handleContinue() {
    setTouched(true);
    if (!validation.valid || !role) return;
    updateOnboardingDraft("username", { username });
    router.push(role === "fan" ? "/onboarding/fan" : "/onboarding/creator");
  }

  if (!ready || !role) return null;

  return (
    <OnboardingShell
      title="Choose a username"
      description="This is how other people on Hush will find you."
      backHref="/onboarding/account-type"
      step={2}
      totalSteps={3}
    >
      <Input
        label="Username"
        value={username}
        onChange={(event) => setUsername(event.target.value.toLowerCase())}
        onBlur={() => setTouched(true)}
        placeholder="jordan_blake"
        error={touched && !validation.valid ? validation.error : undefined}
        hint={!(touched && !validation.valid) ? "3–20 characters: lowercase letters, numbers, underscores." : undefined}
        autoFocus
      />
      <Button onClick={handleContinue} disabled={!username}>
        Continue
      </Button>
    </OnboardingShell>
  );
}
