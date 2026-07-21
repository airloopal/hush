import { CheckCircle2, MessageCircle, ShoppingBag, Zap } from "lucide-react";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { isDemoMode } from "@/lib/auth/mode";
import type { DiscoverCreator } from "@/lib/discover-types";

/**
 * Real mode: every number here is a genuine column from creator_profiles
 * (via the public view) — response_rate, completed_conversations_count.
 * Demo mode: the same layout, but response rate and "unlocks this week"
 * are clearly-labeled illustrative estimates, since MockCreator has no
 * real response-rate field. Never derived from trust/moderation data
 * (reports, blocks) either way — fans must never see that.
 */
function estimateResponseRate(averageReplyMinutes: number): number {
  const rate = 99 - Math.min(14, Math.round(averageReplyMinutes / 3));
  return Math.max(85, rate);
}

function estimateWeeklyUnlocks(creator: DiscoverCreator): number {
  const seed = (creator.conversationCount ?? 0) + (creator.followers ?? 0);
  return 2 + (seed % 9); // small, believable range: 2–10
}

export function CreatorSocialProof({ creator }: { creator: DiscoverCreator }) {
  const demoMode = isDemoMode();
  const responseRate = creator.responseRate ?? estimateResponseRate(creator.averageReplyMinutes);
  const memberSinceYear = new Date(creator.joinedAt).getFullYear();
  const showEstimatedExtras = demoMode || creator.responseRate === undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Activity</h2>
        {showEstimatedExtras && <DemoDataBadge />}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SocialProofStat icon={Zap} label={`Responds within ${creator.averageReplyMinutes}m`} />
        <SocialProofStat
          icon={MessageCircle}
          label={`${(creator.conversationCount ?? 0).toLocaleString()} completed conversations`}
        />
        <SocialProofStat icon={CheckCircle2} label={`${Math.round(responseRate)}% response rate`} />
        <SocialProofStat icon={ShoppingBag} label={`Member since ${memberSinceYear}`} />
      </div>
      {demoMode && (
        <p className="text-xs text-text-muted">
          {estimateWeeklyUnlocks(creator)} fans unlocked chat access with @{creator.username} this week.
        </p>
      )}
    </div>
  );
}

function SocialProofStat({ icon: Icon, label }: { icon: typeof Zap; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-text-secondary">
      <Icon className="h-3.5 w-3.5 shrink-0 text-emerald" aria-hidden="true" />
      {label}
    </div>
  );
}
