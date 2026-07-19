import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export function SafetySection() {
  return (
    <Card className="overflow-hidden transition-colors duration-fast ease-signal hover:bg-surface-muted">
      <Link
        href="/settings/safety"
        className="flex items-center gap-3 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-inset"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald/10 text-emerald">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <CardTitle className="text-base">Safety</CardTitle>
          <CardDescription>Blocked creators, reports, and payment issues</CardDescription>
        </div>
      </Link>
    </Card>
  );
}
