"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, ShieldCheck } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { useRequireAccount } from "@/lib/use-account-guard";
import { resetLocalAccount } from "@/lib/account";

const isDev = process.env.NODE_ENV !== "production";

export default function SettingsPage() {
  const router = useRouter();
  const { ready, account } = useRequireAccount();

  function handleReset() {
    resetLocalAccount();
    router.push("/onboarding/account-type");
  }

  if (!ready || !account) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/settings" user={{ name: account.username }} />

      <main className="container flex max-w-lg flex-col gap-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        <Card>
          <CardHeader className="flex-row items-center gap-3">
            <Avatar
              src={account.role === "creator" ? account.avatarDataUrl : undefined}
              alt={account.username}
              size="lg"
            />
            <div className="flex flex-col">
              <CardTitle className="text-base">@{account.username}</CardTitle>
              <CardDescription className="capitalize">{account.role} account</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {account.role === "creator" ? (
              <>
                <CategoryPill variant={account.isAdult ? "amber" : "neutral"}>
                  {account.category}
                </CategoryPill>
                <p className="text-sm text-text-secondary">{account.bio}</p>
              </>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {account.interests.map((interest) => (
                  <CategoryPill key={interest} variant={interest === "Adult 18+" ? "amber" : "neutral"}>
                    {interest}
                  </CategoryPill>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {account.role === "fan" && (
          <Card className="overflow-hidden transition-colors duration-fast ease-signal hover:bg-surface-muted">
            <Link href="/settings/safety" className="flex items-center gap-3 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-inset">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald/10 text-emerald">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="flex flex-col">
                <CardTitle className="text-base">Safety Centre</CardTitle>
                <CardDescription>Blocked creators, reports, and payment issues</CardDescription>
              </div>
            </Link>
          </Card>
        )}

        {isDev && (
          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="text-base">Developer tools</CardTitle>
              <CardDescription>
                Local-only. Clears hush:account and hush:onboarding-state from this browser and
                restarts onboarding. Not available in production builds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset local account
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav activeHref="/settings" />
    </div>
  );
}
