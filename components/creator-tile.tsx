import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { isCreatorBlocked } from "@/lib/chat";
import type { MockCreator } from "@/lib/types";
import { cn, formatPresence } from "@/lib/utils";

export interface CreatorTileProps {
  creator: MockCreator;
  className?: string;
}

const isSponsored = (creator: MockCreator) =>
  !!creator.boostEndsAt && new Date(creator.boostEndsAt).getTime() > Date.now();

/** Compact marketplace card for Discover — links to the full profile. */
export function CreatorTile({ creator, className }: CreatorTileProps) {
  const sponsored = isSponsored(creator);
  const blocked = isCreatorBlocked(creator.username);

  return (
    <Link href={`/creators/${creator.username}`} className="block">
      <Card
        className={cn(
          "flex h-full flex-col overflow-hidden transition-shadow duration-base hover:shadow-md",
          className
        )}
      >
        {sponsored && !blocked && (
          <div className="flex items-center gap-1.5 bg-violet/10 px-4 py-1.5 text-xs font-medium text-violet">
            <Sparkles className="h-3 w-3" />
            Sponsored
          </div>
        )}
        <CardHeader className="flex-row items-center gap-3 pb-3">
          <Avatar src={creator.avatarUrl} alt={creator.username} size="lg" online={creator.isOnline} />
          <div className="flex flex-1 flex-col">
            <span className="font-semibold leading-tight">@{creator.username}</span>
            <span className="text-sm text-text-secondary">
              {formatPresence(creator.isOnline, creator.lastSeenMinutes)}
            </span>
          </div>
          {blocked ? (
            <StatusBadge status="blocked" />
          ) : (
            creator.isNew && (
              <span className="rounded-pill bg-emerald/10 px-2 py-0.5 text-[11px] font-medium text-emerald">
                New
              </span>
            )
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 pt-0">
          <CategoryPill variant={creator.isAdult ? "amber" : "neutral"}>
            {creator.category}
          </CategoryPill>
          <p className="line-clamp-2 text-sm text-text-secondary">{creator.bio}</p>
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-text-muted">Avg reply ~{creator.averageReplyMinutes}m</span>
            <span className="font-mono-data font-semibold text-text-primary">
              ${creator.chatPrice}
              <span className="text-text-muted"> /24h</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
