"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Flag, Loader2, MessagesSquare, ShieldAlert, UserX } from "lucide-react";

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
import { MediaRequestPanel } from "@/components/media-request-panel";
import { RealSafetyMenu } from "@/components/real-safety-menu";
import { ReportDialog } from "@/components/report-dialog";
import { isBlockedPair, hasIBlocked } from "@/lib/moderation/blocks-client";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRequireAccount } from "@/lib/use-account-guard";
import { hasAdultAccess } from "@/lib/account";
import { MOCK_CREATORS } from "@/lib/creators";
import { findCreatorByUsername } from "@/lib/discovery";
import { isDemoMode } from "@/lib/auth/mode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getClientCreatorRepository } from "@/lib/repositories/creator-repository-client";
import {
  getClientConversationRepository,
  getClientConversationSessionRepository,
} from "@/lib/repositories/conversation-repository-client";
import { ConversationSessionService } from "@/lib/services/conversation-session-service";
import { getClientMessageRepository } from "@/lib/repositories/message-repository-client";
import { createMessagingService } from "@/lib/services/messaging-service";
import { TypingChannel } from "@/lib/realtime/typing-channel";
import { startPresenceHeartbeat, formatPresenceLabel } from "@/lib/realtime/presence";
import type { DiscoverCreator } from "@/lib/discover-types";
import type { ConversationSummary } from "@/lib/conversation-types";
import type { OptimisticMessage } from "@/lib/message-types";
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

  // Sprint L9.1: real mode never has the target creator in MOCK_CREATORS,
  // and needs its own async lookup/loading/not-found handling — branch
  // out before any of the demo-only checks below, which don't apply.
  if (!isDemoMode()) {
    return (
      <RealChatConversation
        fanUsername={fanUsername}
        creatorUsername={creatorUsername}
        isFanViewer={isFanViewer}
        viewerUsername={account.username}
      />
    );
  }

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
            <h1 className="truncate font-semibold leading-tight">@{headerUsername}</h1>
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
            You&apos;ve blocked this creator. They can no longer send you messages, and messaging is
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

/**
 * Sprint L9.1 — minimal real-mode wiring for this page. The message
 * thread itself still isn't wired for real mode (an explicit, documented
 * decision since Sprints L3/L4 — this is the app's largest,
 * safety-critical page, and extending it further here would reopen that
 * same risk for a different sprint's scope). What *is* real here: session
 * lookup/countdown (reusing ConversationSessionService, Sprint L3) and
 * the full L9 live media request system (MediaRequestPanel) — this
 * sprint's actual objective.
 */
function RealChatConversation({
  fanUsername,
  creatorUsername,
  isFanViewer,
  viewerUsername,
}: {
  fanUsername: string;
  creatorUsername: string;
  isFanViewer: boolean;
  viewerUsername: string;
}) {
  const activeHref = isFanViewer ? "/chats" : "/dashboard";
  const [ownId, setOwnId] = React.useState<string | null | undefined>(undefined);
  const [creator, setCreator] = React.useState<DiscoverCreator | null | undefined>(undefined);
  const [conversation, setConversation] = React.useState<ConversationSummary | null | undefined>(undefined);
  const [session, setSession] = React.useState<Awaited<ReturnType<ConversationSessionService["getActive"]>>>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [hasIBlockedThem, setHasIBlockedThem] = React.useState(false);

  const sessionService = React.useMemo(
    () => new ConversationSessionService(getClientConversationSessionRepository()),
    []
  );
  const messageRepo = React.useMemo(() => getClientMessageRepository(), []);
  const messagingService = React.useMemo(
    () => createMessagingService(messageRepo, getClientConversationSessionRepository()),
    [messageRepo]
  );

  // --- Identity + conversation + session -----------------------------------
  // Sprint L10: resolves BOTH viewer roles through getUserConversations()
  // (Sprint L3) rather than getConversationByUsers() with a looked-up
  // counterpart UUID — a creator viewer has no RLS-permitted way to read
  // an arbitrary fan's profiles row just to find their id, but
  // getUserConversations() already returns fanUsername/creatorUsername
  // resolved server-side, scoped to the caller's own conversations. This
  // also means a URL for a conversation the viewer isn't part of simply
  // never appears in this list — never a client-trusted UUID.
  React.useEffect(() => {
    let cancelled = false;
    setLoadError(false);

    async function load() {
      const {
        data: { user },
      } = await createSupabaseBrowserClient().auth.getUser();
      if (!user || cancelled) return;
      setOwnId(user.id);

      if (isFanViewer) {
        const foundCreator = await getClientCreatorRepository().getCreatorByUsername(creatorUsername);
        if (cancelled) return;
        setCreator(foundCreator);
      }

      const conversations = await getClientConversationRepository().getUserConversations(
        user.id,
        isFanViewer ? "fan" : "creator"
      );
      if (cancelled) return;
      const match = conversations.find((c) =>
        isFanViewer ? c.creatorUsername === creatorUsername : c.fanUsername === fanUsername
      );
      setConversation(match ?? null);
      if (!match) return;

      const counterpartId = isFanViewer ? match.creatorId : match.fanId;
      const [activeSession, blocked, iBlockedThem] = await Promise.all([
        sessionService.getActive(match.id),
        isBlockedPair(counterpartId),
        hasIBlocked(counterpartId),
      ]);
      if (cancelled) return;
      setSession(activeSession);
      setIsBlocked(blocked);
      setHasIBlockedThem(iBlockedThem);
    }

    load().catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => {
      cancelled = true;
    };
  }, [creatorUsername, fanUsername, isFanViewer, sessionService]);

  // --- Messages --------------------------------------------------------------
  const [messages, setMessages] = React.useState<OptimisticMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = React.useState(true);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [hasMoreHistory, setHasMoreHistory] = React.useState(true);
  const [typingUsername, setTypingUsername] = React.useState<string | null>(null);
  const [presenceLabel, setPresenceLabel] = React.useState<string | undefined>();
  const typingChannelRef = React.useRef<TypingChannel | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const initialScrollDone = React.useRef(false);

  // Initial page load (Sprint L4's cursor pagination, oldest-to-newest).
  React.useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    setMessagesLoading(true);
    initialScrollDone.current = false;
    messageRepo
      .getMessages(conversation.id, { limit: 30 })
      .then((page) => {
        if (cancelled) return;
        setMessages(page.map((m) => ({ ...m, deliveryState: "sent" as const })));
        setHasMoreHistory(page.length === 30);
        setMessagesLoading(false);
      })
      .catch(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversation, messageRepo]);

  // Scroll to the newest message once, after the first page loads.
  React.useEffect(() => {
    if (messagesLoading || initialScrollDone.current) return;
    initialScrollDone.current = true;
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messagesLoading]);

  async function loadOlderMessages() {
    if (!conversation || loadingOlder || !hasMoreHistory || messages.length === 0) return;
    setLoadingOlder(true);
    const container = scrollContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;
    try {
      const older = await messageRepo.getMessages(conversation.id, { cursor: messages[0].createdAt, limit: 30 });
      setMessages((prev) => [...older.map((m) => ({ ...m, deliveryState: "sent" as const })), ...prev]);
      setHasMoreHistory(older.length === 30);
      // Retain scroll position — don't let loading older history yank the
      // viewer's place in the conversation.
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - previousHeight;
      });
    } catch {
      // best-effort — leave hasMoreHistory as-is so a retry (scrolling up again) is possible
    } finally {
      setLoadingOlder(false);
    }
  }

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (el && el.scrollTop < 80) void loadOlderMessages();
  }

  // Realtime subscription (Sprint L4) — reconciles against any optimistic
  // entry with the same clientMessageId rather than appending a duplicate,
  // and separately dedupes by id in case the same event is ever delivered
  // twice.
  React.useEffect(() => {
    if (!conversation) return;
    const unsubscribe = messageRepo.subscribeToMessages(conversation.id, (incoming) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        const optimisticIndex = incoming.clientMessageId
          ? prev.findIndex((m) => m.clientMessageId === incoming.clientMessageId)
          : -1;
        if (optimisticIndex >= 0) {
          const next = [...prev];
          next[optimisticIndex] = { ...incoming, deliveryState: "sent" };
          return next;
        }
        return [...prev, { ...incoming, deliveryState: "sent" }];
      });
    });
    return unsubscribe;
  }, [conversation, messageRepo]);

  // Presence heartbeat (Sprint L4) — records that the viewer is active.
  React.useEffect(() => startPresenceHeartbeat(), []);

  // Read the counterpart's presence once, for the header label. Skipped
  // entirely when blocked (§L11 "typing/presence interaction should stop
  // where appropriate") — there's no reason to show a blocked user's
  // presence.
  React.useEffect(() => {
    if (!conversation || isBlocked) return;
    let cancelled = false;
    const counterpartId = isFanViewer ? conversation.creatorId : conversation.fanId;
    (async () => {
      try {
        const { data } = await createSupabaseBrowserClient()
          .from("user_presence")
          .select("last_active_at")
          .eq("user_id", counterpartId)
          .maybeSingle();
        if (!cancelled) setPresenceLabel(formatPresenceLabel(data?.last_active_at ?? null));
      } catch {
        // presence is informative only — silently skip on failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation, isFanViewer, isBlocked]);

  // Typing channel (Sprint L4) — not created at all when blocked, so a
  // blocked pair can neither send nor receive typing broadcasts.
  React.useEffect(() => {
    if (!conversation || isBlocked) {
      typingChannelRef.current = null;
      setTypingUsername(null);
      return;
    }
    const channel = new TypingChannel(conversation.id, viewerUsername, (username, isTyping) => {
      setTypingUsername(isTyping ? username : null);
    });
    typingChannelRef.current = channel;
    return () => {
      channel.dispose();
      typingChannelRef.current = null;
    };
  }, [conversation, viewerUsername, isBlocked]);

  // Read receipts (Sprint L4) — mark read whenever the visible thread
  // changes while this conversation is open.
  React.useEffect(() => {
    if (!conversation || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.deliveryState !== "sent") return;
    messageRepo.markConversationRead(conversation.id, last.id).catch(() => {});
  }, [conversation, messages, messageRepo]);

  async function handleSend(body: string) {
    if (!conversation || !ownId) return;
    typingChannelRef.current?.notifyStopped();
    const clientMessageId = crypto.randomUUID();
    const optimistic: OptimisticMessage = {
      id: clientMessageId,
      conversationId: conversation.id,
      senderId: ownId,
      senderUsername: viewerUsername,
      body,
      messageType: "text",
      clientMessageId,
      createdAt: new Date().toISOString(),
      deliveryState: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);

    const result = await messagingService.send(conversation.id, body, clientMessageId);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.clientMessageId !== clientMessageId) return m;
        return result.ok && result.message ? { ...result.message, deliveryState: "sent" } : { ...m, deliveryState: "failed" };
      })
    );
  }

  async function handleRetry(failed: OptimisticMessage) {
    if (!conversation || !failed.clientMessageId) return;
    setMessages((prev) => prev.map((m) => (m.id === failed.id ? { ...m, deliveryState: "sending" } : m)));
    const result = await messagingService.send(conversation.id, failed.body, failed.clientMessageId);
    setMessages((prev) =>
      prev.map((m) => {
        if (m.clientMessageId !== failed.clientMessageId) return m;
        return result.ok && result.message ? { ...result.message, deliveryState: "sent" } : { ...m, deliveryState: "failed" };
      })
    );
  }

  if (loadError) {
    return (
      <ChatShell activeHref={activeHref} username={viewerUsername}>
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load this conversation"
          description="Something went wrong reaching the server. Check your connection and try again."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </ChatShell>
    );
  }

  if (ownId === undefined || (isFanViewer && creator === undefined) || conversation === undefined) {
    return (
      <ChatShell activeHref={activeHref} username={viewerUsername}>
        <div className="flex flex-col items-center gap-3 py-16 text-text-secondary">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <p className="text-sm">Loading…</p>
        </div>
      </ChatShell>
    );
  }

  if (isFanViewer && !creator) {
    return (
      <ChatShell activeHref={activeHref} username={viewerUsername}>
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

  if (!conversation) {
    return (
      <ChatShell activeHref={activeHref} username={viewerUsername}>
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
      </ChatShell>
    );
  }

  const sessionActive = sessionService.isActive(session);
  const headerUsername = isFanViewer ? creatorUsername : fanUsername;
  const counterpartId = isFanViewer ? conversation.creatorId : conversation.fanId;
  const composerDisabled = !sessionActive || isBlocked;
  const composerDisabledReason = isBlocked
    ? "You can't message this person."
    : !sessionActive
      ? "Chat access has ended. Renew to keep chatting."
      : undefined;

  return (
    <ChatShell activeHref={activeHref} username={viewerUsername}>
      <div className="flex h-[calc(100vh-8.5rem)] max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface md:h-[calc(100vh-6rem)]">
        <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <Avatar src={isFanViewer ? creator?.avatarUrl : undefined} alt={headerUsername} size="md" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate font-semibold leading-tight">@{headerUsername}</h1>
            {presenceLabel && <span className="text-xs text-text-secondary">{presenceLabel}</span>}
          </div>
          <div className="flex items-center gap-2" aria-live="polite">
            {sessionActive && session ? (
              <Countdown target={session.expiresAt} variant="compact" />
            ) : (
              <span className="font-mono-data text-xs text-danger">Expired</span>
            )}
            <StatusBadge status={sessionActive ? "live" : "expired"} />
            <RealSafetyMenu
              counterpartId={counterpartId}
              counterpartUsername={headerUsername}
              conversationId={conversation.id}
              viewerRole={isFanViewer ? "fan" : "creator"}
              isBlocked={hasIBlockedThem}
              onBlockedChange={(blocked) => {
                setHasIBlockedThem(blocked);
                setIsBlocked(blocked || isBlocked);
                // Re-confirm the mutual-effect flag from the server rather
                // than trusting this optimistic guess (the other party
                // may independently have blocked/unblocked too).
                isBlockedPair(counterpartId).then(setIsBlocked).catch(() => {});
              }}
            />
          </div>
        </header>

        {isBlocked && (
          <div className="flex items-center gap-2 border-b border-border bg-danger/5 px-3 py-2 text-xs text-danger" aria-live="polite">
            <UserX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {hasIBlockedThem
              ? `You've blocked @${headerUsername} — they can't message you, request media, or start a new chat with you.`
              : `You can no longer interact with @${headerUsername}.`}
          </div>
        )}

        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex h-full flex-col gap-1 overflow-y-auto p-4"
          >
            {messagesLoading ? (
              <div className="flex flex-1 items-center justify-center text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="Say hello"
                description={`Your conversation with @${headerUsername} starts here. Say hello to break the ice.`}
              />
            ) : (
              <>
                {loadingOlder && (
                  <div className="flex justify-center py-2 text-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </div>
                )}
                {messages.map((message) => (
                  <RealMessageRow
                    key={message.id}
                    message={message}
                    isOwn={message.senderId === ownId}
                    onRetry={() => handleRetry(message)}
                    counterpartId={counterpartId}
                    counterpartUsername={headerUsername}
                    viewerRole={isFanViewer ? "fan" : "creator"}
                    conversationId={conversation.id}
                  />
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {typingUsername && (
          <p className="border-t border-border px-3 pt-2 text-xs italic text-text-muted">{typingUsername} is typing…</p>
        )}

        {isFanViewer && (
          <MediaRequestPanel
            conversationId={conversation.id}
            sessionActive={sessionActive && !isBlocked}
            photoPriceLabel={`$${creator?.photoPrice ?? "0.00"}`}
            videoPriceLabel={`$${creator?.videoPrice ?? "0.00"}`}
            counterpartId={counterpartId}
            counterpartUsername={headerUsername}
            viewerRole="fan"
          />
        )}

        <ChatComposer
          disabled={composerDisabled}
          disabledReason={composerDisabledReason}
          onSend={handleSend}
          onTyping={() => typingChannelRef.current?.notifyTyping()}
          onStopTyping={() => typingChannelRef.current?.notifyStopped()}
        />

        {!sessionActive && (
          <div className="flex flex-col gap-2 border-t border-border bg-amber/5 p-3" aria-live="polite">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium text-text-primary">Chat access has ended</p>
                <p className="text-xs text-text-secondary">
                  {isFanViewer
                    ? "Renew from this creator's profile to unlock another 24 hours."
                    : "This fan's access has ended. They can renew from your profile."}
                </p>
              </div>
            </div>
            {isFanViewer && (
              <Button variant="outline" size="sm" asChild className="w-fit">
                <Link href={`/creators/${creatorUsername}`}>View profile to renew</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </ChatShell>
  );
}

function RealMessageRow({
  message,
  isOwn,
  onRetry,
  counterpartId,
  counterpartUsername,
  viewerRole,
  conversationId,
}: {
  message: OptimisticMessage;
  isOwn: boolean;
  onRetry: () => void;
  counterpartId: string;
  counterpartUsername: string;
  viewerRole: "fan" | "creator";
  conversationId: string;
}) {
  const [reportOpen, setReportOpen] = React.useState(false);
  const asChatMessage = {
    id: message.id,
    sessionId: message.conversationId,
    senderRole: (isOwn ? "fan" : "creator") as "fan" | "creator", // only used by ChatMessageBubble to decide alignment
    senderUsername: message.senderUsername,
    body: message.body,
    sentAt: message.createdAt,
    type: "text" as const,
  };
  return (
    <div className="group flex flex-col gap-1">
      <div className={`flex items-end gap-1 ${isOwn ? "flex-row-reverse" : ""}`}>
        <div className="min-w-0 flex-1">
          <ChatMessageBubble message={asChatMessage} viewerRole={isOwn ? "fan" : "creator"} />
        </div>
        {!isOwn && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="mb-1 shrink-0 text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            aria-label="Report this message"
            title="Report this message"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {message.deliveryState === "sending" && (
        <span className={`text-[11px] text-text-muted ${isOwn ? "self-end pr-1" : "self-start pl-1"}`}>Sending…</span>
      )}
      {message.deliveryState === "failed" && (
        <span className={`flex items-center gap-1.5 text-[11px] text-danger ${isOwn ? "self-end pr-1" : "self-start pl-1"}`}>
          Failed to send
          <button type="button" onClick={onRetry} className="underline underline-offset-2">
            Retry
          </button>
        </span>
      )}
      {!isOwn && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          context={{ kind: "message", label: "this message", messageId: message.id, messageSnippet: message.body }}
          counterpartUsername={counterpartUsername}
          viewerRole={viewerRole}
          reportedUserId={counterpartId}
          conversationId={conversationId}
        />
      )}
    </div>
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
