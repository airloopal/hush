import type { DiscoverCreator } from "@/lib/discover-types";

export function CreatorStatsRow({ creator }: { creator: DiscoverCreator }) {
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-md border border-border p-3 text-center">
      <div className="flex flex-col gap-0.5">
        <dt className="text-[11px] uppercase tracking-wide text-text-muted">Member since</dt>
        <dd className="text-sm font-semibold text-text-primary">
          {new Date(creator.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-[11px] uppercase tracking-wide text-text-muted">Conversations</dt>
        <dd className="text-sm font-semibold text-text-primary">
          {creator.conversationCount?.toLocaleString() ?? "—"}
        </dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-[11px] uppercase tracking-wide text-text-muted">Followers</dt>
        <dd className="text-sm font-semibold text-text-primary">{creator.followers?.toLocaleString() ?? "—"}</dd>
      </div>
    </dl>
  );
}
