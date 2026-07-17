"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Camera, MessageCircle, ShieldAlert, Video } from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryPill } from "@/components/ui/category-pill";
import { UnlockChatModal } from "@/components/unlock-chat-modal";
import { Countdown } from "@/components/countdown";
import { useRequireAccount } from "@/lib/use-account-guard";
import { hasAdultAccess } from "@/lib/account";
import { findCreatorByUsername } from "@/lib/discovery";
import { MOCK_CREATORS } from "@/lib/creators";
import { findActiveSession, findLatestSession } from "@/lib/chat";
import { formatPresence } from "@/lib/utils";
import type { Account } from "@/lib/types";
import type { ChatSession } from "@/lib/chat-types";

export default function CreatorProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { ready, account } = useRequireAccount();

  if (!ready || !account) return null;

  const creator = findCreatorByUsername(MOCK_CREATORS, params.username);

  if (!creator) {
    return (
      <ProfileShell account={account}>
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
      </ProfileShell>
    );
  }

  const canViewAdult = !creator.isAdult || hasAdultAccess(account);

  if (!canViewAdult) {
    return (
      <ProfileShell account={account}>
        <EmptyState
          icon={ShieldAlert}
          title="Adult 18+ content restricted"
          description="This creator's profile is only visible to fans who have selected Adult 18+ and completed adult confirmation in onboarding."
          action={
            <Button variant="outline" asChild>
              <Link href="/discover">Back to Discover</Link>
            </Button>
          }
        />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell account={account}>
      <Card className="max-w-lg">
        <CardHeader className="flex-row items-center gap-4">
          <Avatar src={creator.avatarUrl} alt={creator.username} size="xl" online={creator.isOnline} />
          <div className="flex flex-1 flex-col gap-1.5">
            <span className="text-xl font-semibold leading-tight">@{creator.username}</span>
            <span className="text-sm text-text-secondary">
              {formatPresence(creator.isOnline, creator.lastSeenMinutes)}
            </span>
            <CategoryPill variant={creator.isAdult ? "amber" : "neutral"} className="w-fit">
              {creator.category}
            </CategoryPill>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">{creator.bio}</p>
          <p className="text-sm text-text-muted">
            Average reply time: <span className="text-text-primary">~{creator.averageReplyMinutes}m</span>
          </p>

          <div className="flex flex-col divide-y divide-border rounded-md border border-border">
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm">
                <MessageCircle className="h-4 w-4 text-text-muted" />
                24-hour access · unlimited text
              </span>
              <span className="font-mono-data text-sm font-semibold">${creator.chatPrice}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm">
                <Camera className="h-4 w-4 text-text-muted" />
                Live photo
              </span>
              <span className="font-mono-data text-sm font-semibold">+${creator.photoPrice}</span>
            </div>
            <div className="flex items-center justify-between p-3">
              <span className="flex items-center gap-2 text-sm">
                <Video className="h-4 w-4 text-text-muted" />
                Live video
              </span>
              <span className="font-mono-data text-sm font-semibold">+${creator.videoPrice}</span>
            </div>
          </div>

          {account.role === "fan" ? (
            <ChatCta creator={creator} fanUsername={account.username} router={router} />
          ) : (
            <p className="text-xs text-text-muted">
              Only fan accounts can unlock chat access with a creator.
            </p>
          )}
        </CardContent>
      </Card>
    </ProfileShell>
  );
}

/** CTA button whose label/action depends on any existing session with this creator. */
function ChatCta({
  creator,
  fanUsername,
  router,
}: {
  creator: NonNullable<ReturnType<typeof findCreatorByUsername>>;
  fanUsername: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [session, setSession] = React.useState<ChatSession | undefined>(undefined);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    setSession(
      findActiveSession(fanUsername, creator.username) ?? findLatestSession(fanUsername, creator.username)
    );
    setChecked(true);
  }, [fanUsername, creator.username]);

  if (!checked) return null;

  const active = session && findActiveSession(fanUsername, creator.username);

  if (active) {
    return (
      <div className="flex items-center gap-3">
        <Button onClick={() => router.push(`/chats/${creator.username}`)}>Continue Chat</Button>
        <Countdown target={active.expiresAt} variant="compact" />
      </div>
    );
  }

  return (
    <UnlockChatModal
      creatorId={creator.id}
      creatorUsername={creator.username}
      fanUsername={fanUsername}
      chatPrice={creator.chatPrice}
      photoPrice={creator.photoPrice}
      videoPrice={creator.videoPrice}
      mode={session ? "renew" : "new"}
      triggerLabel={session ? "Unlock Another 24 Hours" : "Unlock Chat"}
      onUnlocked={() => router.push(`/chats/${creator.username}`)}
    />
  );
}

function ProfileShell({
  account,
  children,
}: {
  account: Account;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/discover" user={{ name: account.username }} />
      <main className="container flex flex-col gap-6 py-10">{children}</main>
      <BottomNav activeHref="/discover" />
    </div>
  );
}
