"use client";

import * as React from "react";
import { MessagesSquare } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { ChatListItem } from "@/components/chat-list-item";
import { useRequireAccount } from "@/lib/use-account-guard";
import { getAllSessionsForFan, getLastMessage, isConversationUnreadForFan, sortFanChatSessions } from "@/lib/chat";
import { MOCK_CREATORS } from "@/lib/creators";
import { findCreatorByUsername } from "@/lib/discovery";
import type { ChatSession } from "@/lib/chat-types";

export default function ChatsPage() {
  const { ready, account } = useRequireAccount();
  const [sessions, setSessions] = React.useState<ChatSession[] | null>(null);

  React.useEffect(() => {
    if (!ready || !account || account.role !== "fan") return;
    setSessions(sortFanChatSessions(getAllSessionsForFan(account.username)));
  }, [ready, account]);

  if (!ready || !account) return null;

  const isFan = account.role === "fan";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/chats" user={{ name: account.username }} />

      <main className="container flex max-w-2xl flex-col gap-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>

        {!isFan ? (
          <EmptyState
            icon={MessagesSquare}
            title="Creator chats live on your dashboard"
            description="Active conversations with fans show up in your dashboard's Active Conversations section."
          />
        ) : !sessions || sessions.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No conversations yet"
            description="Unlock a creator's chat access from their profile in Discover to start a conversation."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => {
              const creator = findCreatorByUsername(MOCK_CREATORS, session.creatorUsername);
              const lastMessage = getLastMessage(session.id);
              return (
                <ChatListItem
                  key={session.id}
                  session={session}
                  creatorAvatarUrl={creator?.avatarUrl}
                  lastMessage={lastMessage}
                  unread={isConversationUnreadForFan(session.fanUsername, session.creatorUsername)}
                />
              );
            })}
          </div>
        )}
      </main>

      <BottomNav activeHref="/chats" />
    </div>
  );
}
