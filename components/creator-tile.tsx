import * as React from "react";
import Link from "next/link";
import { Camera, Sparkles, Video } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { CategoryPill } from "@/components/ui/category-pill";
import { StatusBadge } from "@/components/ui/status-badge";
import { ResponseTimeChip } from "@/components/response-time-chip";
import { FavoriteButton } from "@/components/favorite-button";
import { isCreatorBlocked } from "@/lib/chat";
import type { DiscoverCreator } from "@/lib/discover-types";
import { cn, formatPresence } from "@/lib/utils";

export interface CreatorTileProps {
  creator: DiscoverCreator;
  className?: string;
}

const isSponsored = (creator: DiscoverCreator) =>
  !!creator.boostEndsAt && new Date(creator.boostEndsAt).getTime() > Date.now();

/** Compact marketplace card for Discover — links to the full profile.
 * The favourite button must not be a descendant of the profile link (a
 * <button> inside an <a> is invalid HTML and breaks keyboard/AT behavior),
 * so the link is a full-cover overlay and the visible card is
 * pointer-events-none, with group-hover driving its hover styling. */
export function CreatorTile({ creator, className }: CreatorTileProps) {
  const sponsored = isSponsored(creator);
  const blocked = isCreatorBlocked(creator.username);

  return (
    <div className="group relative h-full">
      <Link
        href={`/creators/${creator.username}`}
        aria-label={`View @${creator.username}'s profile`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <Card
        className={cn(
          "pointer-events-none relative z-[1] flex h-full flex-col overflow-hidden transition-[box-shadow,transform,border-color] duration-base ease-signal group-hover:-translate-y-1 group-hover:border-emerald/30 group-hover:shadow-lg",
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
          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <ResponseTimeChip minutes={creator.averageReplyMinutes} />
              <span className="inline-flex items-center gap-1 rounded-pill bg-emerald/10 px-2.5 py-1 font-mono-data text-sm font-semibold text-emerald">
                ${creator.chatPrice}
                <span className="text-[11px] font-medium text-emerald/70">/24h</span>
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <Camera className="h-3 w-3" aria-hidden="true" />
                <span className="font-mono-data">${creator.photoPrice}</span>
              </span>
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" aria-hidden="true" />
                <span className="font-mono-data">${creator.videoPrice}</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      <FavoriteButton
        username={creator.username}
        creatorId={creator.id}
        size="sm"
        className="pointer-events-auto absolute right-3 top-3 z-[2]"
      />
    </div>
  );
}
