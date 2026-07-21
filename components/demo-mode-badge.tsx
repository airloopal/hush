import { FlaskConical } from "lucide-react";

export function DemoModeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill border border-violet/30 bg-violet/10 px-2.5 py-1 text-xs font-medium text-violet">
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      Demo mode — Supabase not configured
    </span>
  );
}
