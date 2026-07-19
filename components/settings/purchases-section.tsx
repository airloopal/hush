"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";

import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { getPurchaseHistoryForFan, summarizePurchases } from "@/lib/purchases";

export function PurchasesSection({ fanUsername }: { fanUsername: string }) {
  const [totalSpent, setTotalSpent] = React.useState<number | null>(null);

  React.useEffect(() => {
    setTotalSpent(summarizePurchases(getPurchaseHistoryForFan(fanUsername)).totalSpent);
  }, [fanUsername]);

  return (
    <Card className="overflow-hidden transition-colors duration-fast ease-signal hover:bg-surface-muted">
      <Link
        href="/settings/purchases"
        className="flex items-center justify-between gap-3 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-inset"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald/10 text-emerald">
            <Receipt className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <CardTitle className="text-base">Purchases</CardTitle>
            <CardDescription>Chat unlocks and live media purchases</CardDescription>
          </div>
        </div>
        {totalSpent !== null && (
          <span className="font-mono-data text-sm font-semibold text-text-primary">
            ${totalSpent.toFixed(2)}
          </span>
        )}
      </Link>
    </Card>
  );
}
