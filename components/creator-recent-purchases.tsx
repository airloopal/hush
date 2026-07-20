import { Camera, MessageCircle, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DemoDataBadge } from "@/components/demo-data-badge";
import { getAllSessionsForCreator, getMediaPurchasesForSession } from "@/lib/chat";

const TYPE_ICON = { chat: MessageCircle, photo: Camera, video: Video } as const;

interface RecentPurchaseRow {
  id: string;
  type: "chat" | "photo" | "video";
  amount: string;
  fanUsername: string;
}

/**
 * Only ever shows real, seeded activity for this creator — there's no
 * fabricated purchase history for the other creators in the directory who
 * don't have real conversations behind them, so this section simply
 * doesn't render for them rather than inventing fake transactions.
 */
function getRecentPurchases(creatorUsername: string): RecentPurchaseRow[] {
  const sessions = getAllSessionsForCreator(creatorUsername)
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 3);

  const rows: RecentPurchaseRow[] = sessions.map((session) => ({
    id: session.id,
    type: "chat",
    amount: session.chatPrice,
    fanUsername: session.fanUsername,
  }));

  for (const session of sessions) {
    for (const purchase of getMediaPurchasesForSession(session.id)) {
      if (purchase.status !== "fulfilled") continue;
      rows.push({
        id: purchase.id,
        type: purchase.mediaType,
        amount: purchase.price,
        fanUsername: purchase.fanUsername,
      });
    }
  }

  return rows.slice(0, 4);
}

export function CreatorRecentPurchases({ creatorUsername }: { creatorUsername: string }) {
  const purchases = getRecentPurchases(creatorUsername);
  if (purchases.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-text-primary">Recent Purchases</h2>
        <DemoDataBadge />
      </div>
      <div className="flex flex-col gap-1.5">
        {purchases.map((row) => {
          const Icon = TYPE_ICON[row.type];
          return (
            <Card key={row.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <span className="flex items-center gap-2 text-xs text-text-secondary">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
                  {row.type === "chat" ? "24-hour chat unlocked" : `Live ${row.type} purchased`}
                </span>
                <span className="font-mono-data text-xs font-semibold text-text-primary">
                  ${row.amount}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
