import { notFound } from "next/navigation";
import { isDemoMode } from "@/lib/auth/mode";
import { getCurrentUserResult } from "@/lib/auth/current-user";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

export const dynamic = "force-dynamic";

/**
 * Temporary go-live diagnostics page (Launch Sprint L1). Intentionally
 * not linked from anywhere in the UI — it exists to confirm a real
 * Supabase deployment is wired correctly, not as a permanent product
 * feature. Remove this route once go-live is confirmed, or keep it
 * gated as below if it proves useful for ongoing support.
 *
 * Access: allowed in development regardless of role, or in any
 * environment for an admin/moderator/super_admin. Everyone else gets a
 * plain 404 (not a redirect) so the route's existence isn't disclosed.
 * Never renders a secret, key, or token — only IDs and status enums.
 */
export default async function DiagnosticsPage() {
  const isDev = process.env.NODE_ENV === "development";

  if (isDemoMode()) {
    if (!isDev) notFound();
    return (
      <DiagnosticsShell>
        <DiagnosticsRow label="Supabase connection" value={<StatusBadge status="draft" />} note="Not configured — running in local demo mode." />
      </DiagnosticsShell>
    );
  }

  const result = await getCurrentUserResult();
  const isPrivileged = result.status === "ok" && ["moderator", "admin", "super_admin"].includes(result.user.role);

  if (!isDev && !isPrivileged) notFound();

  return (
    <DiagnosticsShell>
      <DiagnosticsRow
        label="Supabase connection"
        value={<StatusBadge status="completed" />}
        note="Environment variables present; a live query succeeded below."
      />
      {result.status === "signed-out" && <DiagnosticsRow label="Session" value="Signed out" />}
      {result.status === "missing-profile" && (
        <>
          <DiagnosticsRow label="Auth user ID" value={<code>{result.authUserId}</code>} />
          <DiagnosticsRow label="Profile" value={<StatusBadge status="expired" />} note="No profiles row found — handle_new_user() may not have run." />
        </>
      )}
      {result.status === "blocked" && (
        <DiagnosticsRow label="Account status" value={<StatusBadge status="blocked" />} note={`Blocked: ${result.reason}`} />
      )}
      {result.status === "ok" && (
        <>
          <DiagnosticsRow label="Auth user ID" value={<code>{result.user.id}</code>} />
          <DiagnosticsRow label="Profile ID" value={<code>{result.user.profile.id}</code>} />
          <DiagnosticsRow label="Role" value={<code>{result.user.role}</code>} />
          <DiagnosticsRow label="Profile status" value={<code>{result.user.profile.status}</code>} />
          <DiagnosticsRow
            label="Onboarding status"
            value={result.user.onboardingCompleted ? "Completed" : "Incomplete"}
          />
          {result.user.creatorProfile && (
            <DiagnosticsRow label="Creator profile status" value={<code>{result.user.creatorProfile.status}</code>} />
          )}
        </>
      )}
    </DiagnosticsShell>
  );
}

function DiagnosticsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-lg">Go-live diagnostics</CardTitle>
          <CardDescription>
            Temporary, unlinked verification page. No keys, tokens, or secrets are ever shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">{children}</CardContent>
      </Card>
    </div>
  );
}

function DiagnosticsRow({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm font-medium text-text-primary">{value}</span>
      </div>
      {note && <p className="text-xs text-text-muted">{note}</p>}
    </div>
  );
}
