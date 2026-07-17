"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessagesSquare, ShieldAlert } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/countdown";
import { ChatMessageBubble } from "@/components/chat-message-bubble";
import { ChatComposer } from "@/components/chat-composer";
import { UnlockChatModal } from "@/components/unlock-chat-modal";
import { BuyMediaModal } from "@/components/buy-media-modal";
import { SafetyMenu } from "@/components/safety-menu";
import { MediaRequestCard } from "@/components/media-request-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRequireAccount } from "@/lib/use-account-guard";
import { hasAdultAccess } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import { findCreatorByUsername } from "@/lib/discovery";
import {
  addMessage,
  findLatestSession,
  getConversationStatus,
  getMessagesForPair,
  getPendingMediaPurchasesForSession,
  isCreatorBlocked,
  isSessionActive,
} from "@/lib/chat";
import { formatPresence } from "@/lib/utils";
import type { ChatMessage, ChatSession, MediaPurchase } from "@/lib/chat-types";

export default function ActiveChatPage() {
  const params = useParams<{ username: string }>();
  const { ready, account } = useRequireAccount();

  if (!ready || !account) return null;

  const isFanViewer = account.role === "fan";
  const fanUsername = isFanViewer ? account.username : params.username;
  const creatorUsername = isFanViewer ? params.username : account.username;

  const mockCreator = findCreatorByUsername(MOCK_CREATORS, creatorUsername);

  // Adult-content re-check happens here regardless of how this route was
  // reached (typed URL, back button, bookmark) — it does not rely on the
  // creator profile page's own check.
  if (isFanViewer && mockCreator?.isAdult && !hasAdultAccess(account)) {
    return (
      <ChatShell activeHref={isFanViewer ? "/chats" : "/dashboard"} username={account.username}>
        <EmptyState
          icon={ShieldAlert}
          title="Adult 18+ content restricted"
          description="This conversation is only visible to fans who have selected Adult 18+ and completed adult confirmation in onboarding."
          action={
            <Button variant="outline" asChild>
              <Link href="/discover">Back to Discover</Link>
            </Button>
          }
        />
      </ChatShell>
    );
  }

  if (isFanViewer && !mockCreator) {
    return (
      <ChatShell activeHref="/chats" username={account.username}>
        <EmptyState
          icon={ShieldAlert}
          title="Creator not found"
          description="This username doesn't match any creator on Hush."
          action={
            <Button variant="outline" asChild>
              <Link href="/discover">Back to Discover</Link>
            </Button>
          }
        />
      </ChatShell>
    );
  }

  return (
    <ChatConversation
      key={`${fanUsername}:${creatorUsername}`}
      fanUsername={fanUsername}
      creatorUsername={creatorUsername}
      isFanViewer={isFanViewer}
      mockCreator={mockCreator}
      viewerUsername={account.username}
    />
  );
}

function ChatConversation({
  fanUsername,
  creatorUsername,
  isFanViewer,
  mockCreator,
  viewerUsername,
}: {
  fanUsername: string;
  creatorUsername: string;
  isFanViewer: boolean;
  mockCreator: ReturnType<typeof findCreatorByUsername>;
  viewerUsername: string;
}) {
  const [session, setSession] = React.useState<ChatSession | undefined>(() =>
    findLatestSession(fanUsername, creatorUsername)
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>(() =>
    getMessagesForPair(fanUsername, creatorUsername)
  );
  const [isExpired, setIsExpired] = React.useState<boolean>(() => (session ? !isSessionActive(session) : true));
  const [blocked, setBlocked] = React.useState<boolean>(() => isCreatorBlocked(creatorUsername));
  const [pendingPurchases, setPendingPurchases] = React.useState<MediaPurchase[]>(() =>
    session ? getPendingMediaPurchasesForSession(session.id) : []
  );
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function refreshThread() {
    setMessages(getMessagesForPair(fanUsername, creatorUsername));
  }

  function refreshPendingPurchases(activeSession: ChatSession) {
    setPendingPurchases(getPendingMediaPurchasesForSession(activeSession.id));
  }

  function handleUnlocked(newSession: ChatSession) {
    setSession(newSession);
    setIsExpired(false);
    refreshThread();
    refreshPendingPurchases(newSession);
  }

  function handleSend(body: string) {
    if (!session) return;
    addMessage(session.id, isFanViewer ? "fan" : "creator", viewerUsername, body, "text");
    refreshThread();
  }

  function handlePurchased() {
    refreshThread();
    if (session) refreshPendingPurchases(session);
  }

  function handleMediaResolved() {
    refreshThread();
    if (session) refreshPendingPurchases(session);
  }

  const activeHref = isFanViewer ? "/chats" : "/dashboard";
  const presenceLabel = mockCreator ? formatPresence(mockCreator.isOnline, mockCreator.lastSeenMinutes) : undefined;
  const headerUsername = isFanViewer ? creatorUsername : fanUsername;
  const headerAvatar = isFanViewer ? mockCreator?.avatarUrl : undefined;

  const composerDisabled = !session || isExpired || (isFanViewer && blocked);
  const composerDisabledReason = blocked
    ? "You've blocked this creator. Unblock from your device to resume messaging."
    : isExpired
    ? "Chat access has ended. Unlock another 24 hours to keep chatting."
    : undefined;

  return (
    <ChatShell activeHref={activeHref} username={viewerUsername}>
      <div className="flex h-[calc(100vh-8.5rem)] max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface md:h-[calc(100vh-6rem)]">
        <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <Avatar src={headerAvatar} alt={headerUsername} size="md" online={isFanViewer ? mockCreator?.isOnline : undefined} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold leading-tight">@{headerUsername}</span>
            {presenceLabel && <span className="text-xs text-text-secondary">{presenceLabel}</span>}
          </div>
          {session && !isExpired ? (
            <Countdown target={session.expiresAt} variant="compact" onComplete={() => setIsExpired(true)} />
          ) : session ? (
            <span className="font-mono-data text-xs text-danger">Expired</span>
          ) : null}
          {session && (
            <StatusBadge status={getConversationStatus(session, isFanViewer ? blocked : false)} />
          )}
          {session && (
            <SafetyMenu
              session={session}
              viewerRole={isFanViewer ? "fan" : "creator"}
              onBlocked={() => setBlocked(true)}
            />
          )}
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {!session ? (
            <EmptyState
              icon={MessagesSquare}
              title={isFanViewer ? "No chat with this creator yet" : "No conversation with this fan yet"}
              description={
                isFanViewer
                  ? "Unlock 24-hour chat access from their profile to start a conversation."
                  : "This fan hasn't unlocked chat access with you yet."
              }
              action={
                isFanViewer ? (
                  <Button variant="outline" asChild>
                    <Link href={`/creators/${creatorUsername}`}>View profile</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : messages.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="Say hello" description="Start the conversation below." />
          ) : (
            messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} viewerRole={isFanViewer ? "fan" : "creator"} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isFanViewer && pendingPurchases.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border p-3">
            {pendingPurchases.map((purchase) => (
              <MediaRequestCard key={purchase.id} purchase={purchase} onResolved={handleMediaResolved} />
            ))}
          </div>
        )}

        {isFanViewer && session && (
          <div className="flex flex-wrap gap-2 border-t border-border p-3">
            <BuyMediaModal
              session={session}
              mediaType="photo"
              price={mockCreator?.photoPrice ?? "0.00"}
              disabled={isExpired || blocked}
              onPurchased={handlePurchased}
            />
            <BuyMediaModal
              session={session}
              mediaType="video"
              price={mockCreator?.videoPrice ?? "0.00"}
              disabled={isExpired || blocked}
              onPurchased={handlePurchased}
            />
          </div>
        )}

        {isFanViewer && session && isExpired && mockCreator && (
          <div className="flex items-center justify-between gap-3 border-t border-border bg-amber/5 p-3">
            <p className="text-sm text-text-secondary">Chat access has ended.</p>
            <UnlockChatModal
              creatorId={mockCreator.id}
              creatorUsername={mockCreator.username}
              fanUsername={fanUsername}
              chatPrice={mockCreator.chatPrice}
              photoPrice={mockCreator.photoPrice}
              videoPrice={mockCreator.videoPrice}
              mode="renew"
              triggerLabel="Unlock Another 24 Hours"
              onUnlocked={handleUnlocked}
            />
          </div>
        )}

        {session && (
          <ChatComposer disabled={composerDisabled} disabledReason={composerDisabledReason} onSend={handleSend} />
        )}
      </div>
    </ChatShell>
  );
}

function ChatShell({
  activeHref,
  username,
  children,
}: {
  activeHref: string;
  username: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref={activeHref} user={{ name: username }} />
      <main className="container flex flex-col items-center gap-6 py-6">{children}</main>
      <BottomNav activeHref={activeHref} />
    </div>
  );
}
