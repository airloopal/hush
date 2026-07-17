"use client";

import { MessagesSquare } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { useRequireAccount } from "@/lib/use-account-guard";

export default function ChatsPage() {
  const { ready, account } = useRequireAccount();

  if (!ready || !account) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/chats" user={{ name: account.username }} />

      <main className="container flex flex-col gap-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          description="Unlock a creator's chat access from their profile in Discover to start a conversation. Chat functionality is coming in a later stage."
        />
      </main>

      <BottomNav activeHref="/chats" />
    </div>
  );
}
