import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResponseTimeChip } from "@/components/response-time-chip";
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
          "flex h-full flex-col overflow-hidden transition-[box-shadow,transform,border-color] duration-base ease-signal hover:-translate-y-1 hover:border-emerald/30 hover:shadow-lg",
          className
        )}
      >
        {sponsored && !blocked && (
          <div className="flex items-center gap-1.5 bg-violet/10 px-4 py-1.5 text-xs font-medium text-violet">
            <Sparkles className="h-3 w-3" />
            Sponsored
          </div>
        )}
        <CardHeader className="flex-row items-center gap-3.5 pb-3">
          <Avatar src={creator.avatarUrl} alt={creator.username} size="xl" online={creator.isOnline} />
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="font-semibold leading-tight tracking-tight">@{creator.username}</span>
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
          <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
            <ResponseTimeChip minutes={creator.averageReplyMinutes} />
            <span className="inline-flex items-center gap-1 rounded-pill bg-emerald/10 px-2.5 py-1 font-mono-data text-sm font-semibold text-emerald">
              ${creator.chatPrice}
              <span className="text-[11px] font-medium text-emerald/70">/24h</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
