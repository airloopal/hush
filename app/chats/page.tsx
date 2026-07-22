"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, MessagesSquare } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { ChatListItem } from "@/components/chat-list-item";
import { Button } from "@/components/ui/button";
import { useRequireRole } from "@/lib/use-account-guard";
import { isDemoMode } from "@/lib/auth/mode";
import {
  getAllSessionsForFan,
  getLastMessage,
  getMediaPurchasesForSession,
  getRemainingMs,
  isConversationUnreadForFan,
  isSessionActive,
  sortFanChatSessions,
} from "@/lib/chat";
import { MOCK_CREATORS } from "@/lib/creators";
import { findCreatorByUsername } from "@/lib/discovery";
import { getClientConversationRepository, getClientConversationSessionRepository } from "@/lib/repositories/conversation-repository-client";
import { getClientMessageRepository } from "@/lib/repositories/message-repository-client";
import { ConversationSessionService } from "@/lib/services/conversation-session-service";
import type { ChatSession } from "@/lib/chat-types";
import type { ConversationSummary } from "@/lib/conversation-types";

interface RealRow {
  conversation: ConversationSummary;
  active: boolean;
  remainingMs: number;
  unread: boolean;
}

export default function ChatsPage() {
  const { ready, account } = useRequireRole("fan");
  const demoMode = isDemoMode();

  const [sessions, setSessions] = React.useState<ChatSession[] | null>(null);
  const [realRows, setRealRows] = React.useState<RealRow[] | null>(null);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    if (!ready || !account || account.role !== "fan") return;

    if (demoMode) {
      setSessions(sortFanChatSessions(getAllSessionsForFan(account.username)));
      return;
    }

    let cancelled = false;
    setLoadError(false);
    const conversations = getClientConversationRepository();
    const sessionsRepo = getClientConversationSessionRepository();
    const sessionService = new ConversationSessionService(sessionsRepo);

    conversations
      .getUserConversations(account.username, "fan")
      .then(async (list) => {
        const unreadCounts = await getClientMessageRepository()
          .getUnreadCounts(account.username)
          .catch(() => []);
        const unreadByConversation = new Set(unreadCounts.map((u) => u.conversationId));
        const rows = await Promise.all(
          list.map(async (conversation) => {
            const active = await sessionService.getActive(conversation.id);
            return {
              conversation,
              active: sessionService.isActive(active),
              remainingMs: sessionService.getRemainingMs(active),
              unread: unreadByConversation.has(conversation.id),
            };
          })
        );
        if (!cancelled) {
          rows.sort((a, b) => (b.conversation.latestMessageAt ?? "").localeCompare(a.conversation.latestMessageAt ?? ""));
          setRealRows(rows);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, account, demoMode]);

  if (!ready || !account) return null;

  const isFan = account.role === "fan";
  const loading = demoMode ? sessions === null : realRows === null && !loadError;

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
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-text-secondary">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">Loading your conversations…</p>
          </div>
        ) : loadError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load your conversations"
            description="Something went wrong reaching the server. Check your connection and try again."
            action={
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        ) : demoMode ? (
          !sessions || sessions.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No conversations yet"
              description="Unlock a creator's chat access from their profile in Discover to start a conversation."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/discover">Browse creators</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => {
                const creator = findCreatorByUsername(MOCK_CREATORS, session.creatorUsername);
                const lastMessage = getLastMessage(session.id);
                const purchases = getMediaPurchasesForSession(session.id);
                return (
                  <ChatListItem
                    key={session.id}
                    creatorUsername={session.creatorUsername}
                    creatorAvatarUrl={creator?.avatarUrl}
                    active={isSessionActive(session)}
                    remainingMs={getRemainingMs(session)}
                    lastMessagePreview={lastMessage?.body}
                    lastMessageAt={lastMessage?.sentAt}
                    unread={isConversationUnreadForFan(session.fanUsername, session.creatorUsername)}
                    pendingPhoto={purchases.some((p) => p.mediaType === "photo" && p.status === "requested")}
                    pendingVideo={purchases.some((p) => p.mediaType === "video" && p.status === "requested")}
                  />
                );
              })}
            </div>
          )
        ) : !realRows || realRows.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No conversations yet"
            description="Unlock a creator's chat access from their profile in Discover to start a conversation."
            action={
              <Button variant="outline" size="sm" asChild>
                <Link href="/discover">Browse creators</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {realRows.map(({ conversation, active, remainingMs, unread }) => (
              <ChatListItem
                key={conversation.id}
                creatorUsername={conversation.creatorUsername}
                active={active}
                remainingMs={remainingMs}
                lastMessagePreview={conversation.latestMessagePreview ?? undefined}
                lastMessageAt={conversation.latestMessageAt ?? undefined}
                unread={unread}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav activeHref="/chats" />
    </div>
  );
}
