"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requestPasswordReset } from "@/lib/auth/auth-service";
import { validateEmail } from "@/lib/auth/validation";
import { isDemoMode } from "@/lib/auth/mode";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await requestPasswordReset(email);
    } finally {
      setPending(false);
      // Always show the same neutral confirmation — never reveal whether
      // an account exists for this email (prevents email enumeration).
      setSubmitted(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          Hush
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Forgot password</CardTitle>
            <CardDescription>
              {isDemoMode()
                ? "Password reset requires Supabase to be configured — this environment is running in demo mode."
                : "Enter your email and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <p className="text-sm text-text-secondary" role="status">
                If an account exists for <span className="font-medium text-text-primary">{email}</span>, a
                password reset link is on its way. Check your inbox (and spam folder).
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  error={error}
                  disabled={isDemoMode()}
                  required
                />
                <Button type="submit" isLoading={pending} disabled={isDemoMode()}>
                  Send reset link
                </Button>
              </form>
            )}
            <div className="mt-4 text-sm">
              <Link href="/login" className="text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">
                Back to log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
