"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";

import { OnboardingShell } from "@/components/onboarding-shell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRedirectIfOnboarded } from "@/lib/use-account-guard";
import { saveOnboardingState } from "@/lib/account";
import type { AccountRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: Array<{
  role: AccountRole;
  title: string;
  description: string;
  icon: typeof Compass;
}> = [
  {
    role: "fan",
    title: "I'm a fan",
    description: "Discover creators and unlock time-boxed chat access.",
    icon: Compass,
  },
  {
    role: "creator",
    title: "I'm a creator",
    description: "Sell paid chat access, live photos, and live video.",
    icon: Sparkles,
  },
];

export default function AccountTypePage() {
  const router = useRouter();
  const { ready } = useRedirectIfOnboarded();

  function selectRole(role: AccountRole) {
    saveOnboardingState("account-type", { role });
    router.push("/onboarding/username");
  }

  if (!ready) return null;

  return (
    <OnboardingShell
      title="Welcome to Hush"
      description="Let's set up your account. This is a local prototype — nothing here is submitted anywhere."
      step={1}
      totalSteps={3}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {ROLE_OPTIONS.map(({ role, title, description, icon: Icon }) => (
          <Card
            key={role}
            role="button"
            tabIndex={0}
            onClick={() => selectRole(role)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") selectRole(role);
            }}
            className={cn(
              "cursor-pointer transition-colors duration-fast ease-signal hover:border-emerald/50 hover:bg-emerald/5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            )}
          >
            <CardHeader className="gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald/10 text-emerald">
                <Icon className="h-5 w-5" />
              </span>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </OnboardingShell>
  );
}
