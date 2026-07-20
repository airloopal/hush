"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { ProfileSection } from "@/components/settings/profile-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { ChatPreferencesSection } from "@/components/settings/chat-preferences-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SafetySection } from "@/components/settings/safety-section";
import { PurchasesSection } from "@/components/settings/purchases-section";
import { DeveloperSection } from "@/components/settings/developer-section";
import { useRequireAccount } from "@/lib/use-account-guard";
import { resetLocalAccount } from "@/lib/account";
import type { Account } from "@/lib/types";

const isDev = process.env.NODE_ENV !== "production";

export default function SettingsPage() {
  const router = useRouter();
  const { ready, account: loadedAccount } = useRequireAccount();
  const [account, setAccount] = React.useState<Account | null>(null);

  React.useEffect(() => {
    if (loadedAccount) setAccount(loadedAccount);
  }, [loadedAccount]);

  function handleReset() {
    resetLocalAccount();
    router.push("/onboarding/account-type");
  }

  if (!ready || !account) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/settings" user={{ name: account.username }} />

      <main className="container flex max-w-2xl flex-col gap-8 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Account</h2>
          <div className="flex flex-col gap-4">
            <ProfileSection account={account} onAccountChange={setAccount} />
            <AppearanceSection />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">Preferences</h2>
          <div className="flex flex-col gap-4">
            <PrivacySection />
            <ChatPreferencesSection />
            <NotificationsSection />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">More</h2>
          <div className="flex flex-col gap-4">
            {account.role === "fan" && <SafetySection />}
            {account.role === "fan" && <PurchasesSection fanUsername={account.username} />}
            {isDev && <DeveloperSection onReset={handleReset} />}
          </div>
        </div>
      </main>

      <BottomNav activeHref="/settings" />
    </div>
  );
}
