"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updatePassword } from "@/lib/auth/auth-service";
import { validatePasswordStrength, validatePasswordsMatch } from "@/lib/auth/validation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isDemoMode } from "@/lib/auth/mode";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = React.useState<boolean | null>(null);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = React.useState<string | undefined>(undefined);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (isDemoMode()) {
      setHasSession(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const strength = validatePasswordStrength(password);
    const match = validatePasswordsMatch(password, confirm);
    setError(strength.valid ? undefined : strength.error);
    setConfirmError(match.valid ? undefined : match.error);
    if (!strength.valid || !match.valid) return;

    setPending(true);
    const result = await updatePassword(password);
    setPending(false);

    if (!result.ok) {
      setError("Couldn't update your password. Request a new reset link and try again.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="sr-only">Reset password — Hush</h1>
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          Hush
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>Choose a new password for your account.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSession === null ? null : done ? (
              <p className="text-sm text-text-secondary" role="status">
                Password updated. Redirecting you to log in…
              </p>
            ) : !hasSession ? (
              <p className="text-sm text-text-secondary">
                {isDemoMode()
                  ? "Password reset requires Supabase to be configured — this environment is running in demo mode."
                  : "This reset link is invalid or has expired."}{" "}
                <Link href="/forgot-password" className="text-emerald underline-offset-2 hover:underline">
                  Request a new one
                </Link>
                .
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={error}
                  hint={!error ? "At least 8 characters, with a mix of letters and numbers or symbols." : undefined}
                  required
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  error={confirmError}
                  required
                />
                <Button type="submit" isLoading={pending}>
                  Update password
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
