"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, MessagesSquare, ShieldAlert, UserX } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/countdown";
import { ChatMessageBubble } from "@/components/chat-message-bubble";
import { ChatDateSeparator } from "@/components/chat-date-separator";
import { NewMessagesButton } from "@/components/new-messages-button";
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
  markConversationReadByFan,
  syncFanExpiryNotifications,
} from "@/lib/chat";
import { getChatPreferences, getPrivacySettings } from "@/lib/preferences";
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

const SCROLL_BOTTOM_THRESHOLD_PX = 80;

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
  const [chatPreferences] = React.useState(() => getChatPreferences());
  const [allowRenewals] = React.useState(() => getPrivacySettings().allowChatRenewals);

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const previousMessageCount = React.useRef(messages.length);
  const [isAtBottom, setIsAtBottom] = React.useState(true);
  const [hasNewMessages, setHasNewMessages] = React.useState(false);

  // Mark this conversation read as soon as the fan opens it, and again
  // whenever the visible thread changes while they're still here — never
  // on fan-sent or system messages, since those don't drive unread state.
  React.useEffect(() => {
    if (isFanViewer && session) {
      markConversationReadByFan(fanUsername, creatorUsername);
    }
  }, [isFanViewer, session, fanUsername, creatorUsername, messages]);

  // Lazily detect expiring/expired chats for the fan's notification centre —
  // there's no server to push this the instant it happens.
  React.useEffect(() => {
    if (isFanViewer) syncFanExpiryNotifications(fanUsername);
  }, [isFanViewer, fanUsername]);

  // Scroll to the newest message once, on initial load.
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On later updates, auto-scroll only if the viewer is already at the
  // bottom and the autoScroll preference is on; otherwise surface a "new
  // messages" indicator instead of yanking their scroll position.
  React.useEffect(() => {
    const grew = messages.length > previousMessageCount.current;
    previousMessageCount.current = messages.length;
    if (!grew) return;
    if (chatPreferences.autoScroll && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    } else {
      setHasNewMessages(true);
    }
  }, [messages.length, isAtBottom, chatPreferences.autoScroll]);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < SCROLL_BOTTOM_THRESHOLD_PX;
    setIsAtBottom(atBottom);
    if (atBottom) setHasNewMessages(false);
  }

  function jumpToLatest() {
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    setHasNewMessages(false);
    setIsAtBottom(true);
  }

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
    ? "Chat access has ended. Renew below to keep chatting."
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
          <div className="flex items-center gap-2" aria-live="polite">
            {session && !isExpired ? (
              <Countdown target={session.expiresAt} variant="compact" onComplete={() => setIsExpired(true)} />
            ) : session ? (
              <span className="font-mono-data text-xs text-danger">Expired</span>
            ) : null}
            {session && <StatusBadge status={getConversationStatus(session, isFanViewer ? blocked : false)} />}
          </div>
          {session && (
            <SafetyMenu
              session={session}
              viewerRole={isFanViewer ? "fan" : "creator"}
              onBlocked={() => setBlocked(true)}
            />
          )}
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex h-full flex-col gap-1 overflow-y-auto p-4"
          >
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
              <EmptyState
                icon={MessagesSquare}
                title="Say hello"
                description={`Your conversation with @${headerUsername} starts here. Say hello to break the ice.`}
              />
            ) : (
              <MessageList
                messages={messages}
                viewerRole={isFanViewer ? "fan" : "creator"}
                showTimestamps={chatPreferences.showTimestamps}
                compact={chatPreferences.compactSpacing}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
          {hasNewMessages && <NewMessagesButton onClick={jumpToLatest} />}
        </div>

        {!isFanViewer && pendingPurchases.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border p-3">
            {pendingPurchases.map((purchase) => (
              <MediaRequestCard key={purchase.id} purchase={purchase} onResolved={handleMediaResolved} />
            ))}
          </div>
        )}

        {isFanViewer && blocked && (
          <div className="flex items-center gap-2 border-t border-border bg-danger-bg p-3 text-sm text-danger">
            <UserX className="h-4 w-4 shrink-0" aria-hidden="true" />
            You've blocked this creator. They can no longer send you messages, and messaging is
            disabled.
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
          <div className="flex flex-col gap-2 border-t border-border bg-amber/5 p-3" aria-live="polite">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-text-primary">Chat access has ended</p>
                <p className="text-xs text-text-secondary">
                  Your conversation history is saved.{" "}
                  {allowRenewals
                    ? `Renew for another 24 hours of unlimited text with @${mockCreator.username} — a one-time purchase, not a subscription.`
                    : "Chat renewals are turned off in your privacy settings."}
                </p>
              </div>
            </div>
            {allowRenewals ? (
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono-data text-sm font-semibold text-text-primary">
                  ${mockCreator.chatPrice}
                </span>
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
            ) : (
              <Button variant="outline" size="sm" asChild className="w-fit">
                <Link href="/settings">Update privacy settings</Link>
              </Button>
            )}
          </div>
        )}

        {session && (
          <ChatComposer disabled={composerDisabled} disabledReason={composerDisabledReason} onSend={handleSend} />
        )}
      </div>
    </ChatShell>
  );
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Renders the thread with date separators inserted between calendar days. */
function MessageList({
  messages,
  viewerRole,
  showTimestamps,
  compact,
}: {
  messages: ChatMessage[];
  viewerRole: "fan" | "creator";
  showTimestamps: boolean;
  compact: boolean;
}) {
  let previousDate: Date | null = null;

  return (
    <>
      {messages.map((message) => {
        const messageDate = new Date(message.sentAt);
        const showSeparator = !previousDate || !isSameCalendarDay(previousDate, messageDate);
        previousDate = messageDate;
        return (
          <React.Fragment key={message.id}>
            {showSeparator && <ChatDateSeparator date={message.sentAt} />}
            <ChatMessageBubble
              message={message}
              viewerRole={viewerRole}
              showTimestamps={showTimestamps}
              compact={compact}
            />
          </React.Fragment>
        );
      })}
    </>
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
