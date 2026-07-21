"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCcw, Settings } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { homeRouteForRole, setSession } from "@/lib/demo-auth";
import { signOutEverywhere } from "@/lib/auth/auth-service";
import { isDemoMode } from "@/lib/auth/mode";
import { getOtherDemoUser } from "@/lib/demo-users";
import type { DemoUser } from "@/lib/demo-auth-types";

export function AccountMenu({ user }: { user: DemoUser }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  function handleSwitchAccount() {
    const next = getOtherDemoUser(user);
    setSession(next);
    setOpen(false);
    router.push(homeRouteForRole(next.role));
  }

  function handleSettings() {
    setOpen(false);
    router.push("/settings");
  }

  async function handleLogout() {
    setSigningOut(true);
    // Awaited so the Supabase session is actually cleared server-side
    // before we navigate — otherwise a race lets authenticated content
    // flash briefly on the destination page.
    await signOutEverywhere();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalTrigger asChild>
        <button
          type="button"
          aria-label={`Account menu for ${user.displayName}`}
          className="flex items-center gap-2 rounded-full transition-opacity duration-fast ease-signal hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Avatar src={user.avatar} alt={user.displayName} size="sm" />
        </button>
      </ModalTrigger>
      <ModalContent className="max-w-xs">
        <div className="sr-only">
          <ModalTitle>Account menu</ModalTitle>
          <ModalDescription>Switch account, open settings, or log out.</ModalDescription>
        </div>

        <div className="flex items-center gap-3 pb-3">
          <Avatar src={user.avatar} alt={user.displayName} size="lg" />
          <div className="flex flex-col">
            <span className="font-semibold leading-tight">{user.displayName}</span>
            <span className="text-xs capitalize text-text-secondary">{user.role} account</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-2">
          {isDemoMode() && (
            <AccountMenuItem icon={RefreshCcw} label="Switch Account" onClick={handleSwitchAccount} />
          )}
          <AccountMenuItem icon={Settings} label="Settings" onClick={handleSettings} />
          <AccountMenuItem
            icon={LogOut}
            label={signingOut ? "Logging out…" : "Logout"}
            onClick={handleLogout}
            disabled={signingOut}
          />
        </div>
      </ModalContent>
    </Modal>
  );
}

function AccountMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof LogOut;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-text-primary transition-colors duration-fast ease-signal hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-4 w-4 text-text-muted" />
      {label}
    </button>
  );
}
