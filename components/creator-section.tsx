import * as React from "react";
import { Users } from "lucide-react";

import { CreatorTile } from "@/components/creator-tile";
import { EmptyState } from "@/components/empty-state";
import type { MockCreator } from "@/lib/types";

export interface CreatorSectionProps {
  title: string;
  description?: string;
  creators: MockCreator[];
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  /** "row" scrolls horizontally on mobile; "grid" wraps into a full grid. */
  layout?: "row" | "grid";
}

export function CreatorSection({
  title,
  description,
  creators,
  emptyMessage,
  emptyAction,
  layout = "row",
}: CreatorSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
      </div>

      {creators.length === 0 ? (
        <EmptyState icon={Users} title={emptyMessage} action={emptyAction} />
      ) : layout === "row" ? (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {creators.map((creator) => (
            <div key={creator.id} className="w-64 shrink-0">
              <CreatorTile creator={creator} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <CreatorTile key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </section>
  );
}
