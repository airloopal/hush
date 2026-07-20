import { CheckCircle2, MessageCircle, ShoppingBag, Zap } from "lucide-react";
import { DemoDataBadge } from "@/components/demo-data-badge";
import type { MockCreator } from "@/lib/types";

/**
 * These are all derived from existing, already-public MockCreator fields
 * (or a clearly-labeled synthetic demo heuristic) — never the creator's
 * internal trust/moderation data (reports, blocks), which fans must never
 * see per the platform's existing trust & safety design.
 */
function estimateResponseRate(averageReplyMinutes: number): number {
  // Faster typical replies -> higher demo response rate, clamped to a
  // believable 85–99% band. Purely a presentational heuristic.
  const rate = 99 - Math.min(14, Math.round(averageReplyMinutes / 3));
  return Math.max(85, rate);
}

function estimateWeeklyUnlocks(creator: MockCreator): number {
  const seed = (creator.conversationCount ?? 0) + (creator.followers ?? 0);
  return 2 + (seed % 9); // small, believable range: 2–10
}

export function CreatorSocialProof({ creator }: { creator: MockCreator }) {
  const responseRate = estimateResponseRate(creator.averageReplyMinutes);
  const memberSinceYear = new Date(creator.joinedAt).getFullYear();
  const weeklyUnlocks = estimateWeeklyUnlocks(creator);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Activity</h2>
        <DemoDataBadge />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SocialProofStat icon={Zap} label={`Responds within ${creator.averageReplyMinutes}m`} />
        <SocialProofStat
          icon={MessageCircle}
          label={`${(creator.conversationCount ?? 0).toLocaleString()} completed conversations`}
        />
        <SocialProofStat icon={CheckCircle2} label={`${responseRate}% response rate`} />
        <SocialProofStat icon={ShoppingBag} label={`Member since ${memberSinceYear}`} />
      </div>
      <p className="text-xs text-text-muted">
        {weeklyUnlocks} fans unlocked chat access with @{creator.username} this week.
      </p>
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
