"use client";

import * as React from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { signUp } from "@/lib/auth/auth-service";
import { authErrorMessage } from "@/lib/auth/errors";
import {
  validateDateOfBirth,
  validateEmail,
  validatePasswordStrength,
  validatePasswordsMatch,
  validateSignupUsername,
} from "@/lib/auth/validation";
import { isDemoMode } from "@/lib/auth/mode";
import type { AccountRole } from "@/lib/types";

interface FieldErrors {
  displayName?: string;
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  dateOfBirth?: string;
  terms?: string;
}

export default function SignUpPage() {
  const [displayName, setDisplayName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [accountType, setAccountType] = React.useState<AccountRole>("fan");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [adultContentEnabled, setAdultContentEnabled] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);

  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | undefined>(undefined);
  const [pending, setPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const usernameResult = validateSignupUsername(username);
    const emailResult = validateEmail(email);
    const passwordResult = validatePasswordStrength(password);
    const confirmResult = validatePasswordsMatch(password, confirmPassword);
    const dobResult = validateDateOfBirth(dateOfBirth);
    const nextErrors: FieldErrors = {
      displayName: displayName.trim() ? undefined : "Display name is required.",
      username: usernameResult.valid ? undefined : usernameResult.error,
      email: emailResult.valid ? undefined : emailResult.error,
      password: passwordResult.valid ? undefined : passwordResult.error,
      confirmPassword: confirmResult.valid ? undefined : confirmResult.error,
      dateOfBirth: dobResult.valid ? undefined : dobResult.error,
      terms: acceptedTerms ? undefined : "You must accept the Terms and Privacy Policy.",
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFormError(undefined);
    setPending(true);
    // Client-side validation above is a UX convenience only — Supabase and
    // the database's own constraints (see supabase/migrations) are the
    // real enforcement, since this request could be replayed directly.
    const result = await signUp({
      email,
      password,
      displayName,
      username,
      accountType,
      dateOfBirth,
      adultContentEnabled,
    });
    setPending(false);

    if (!result.ok) {
      setFormError(result.errorCode ? authErrorMessage(result.errorCode) : "Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <h1 className="sr-only">Check your email — Hush</h1>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Check your email</CardTitle>
            <CardDescription>
              We sent a verification link to <span className="font-medium text-text-primary">{email}</span>. Click
              it to activate your account and continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="text-sm text-emerald underline-offset-2 hover:underline">
              Back to log in
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <h1 className="sr-only">Create your account — Hush</h1>
        <Link href="/" className="flex items-center justify-center gap-2 font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          Hush
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>
              {isDemoMode()
                ? "Sign-up requires Supabase to be configured — use a demo account from the login page instead."
                : "Join Hush as a fan or a creator."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset disabled={isDemoMode() || pending} className="flex flex-col gap-4">
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                  {(["fan", "creator"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={accountType === type}
                      onClick={() => setAccountType(type)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors duration-fast ease-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald ${
                        accountType === type
                          ? "border-emerald bg-emerald/5 text-text-primary"
                          : "border-border text-text-secondary hover:bg-surface-muted"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <Input
                  label="Display name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  error={errors.displayName}
                  required
                />
                <Input
                  label="Username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  error={errors.username}
                  hint={!errors.username ? "3–20 characters: lowercase letters, numbers, underscores." : undefined}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  error={errors.email}
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.password}
                  required
                />
                <Input
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  error={errors.confirmPassword}
                  required
                />
                <Input
                  label="Date of birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  error={errors.dateOfBirth}
                  hint={!errors.dateOfBirth ? "You must be at least 18 to use Hush." : undefined}
                  required
                />

                <label className="flex items-start gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                    checked={adultContentEnabled}
                    onChange={(event) => setAdultContentEnabled(event.target.checked)}
                  />
                  I am 18 or older and want to see Adult 18+ content.
                </label>

                <label className="flex items-start gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                  />
                  I accept the Terms and Privacy Policy.
                </label>
                {errors.terms && <p className="text-xs text-danger">{errors.terms}</p>}

                {formError && (
                  <p className="text-sm text-danger" role="alert">
                    {formError}
                  </p>
                )}

                <Button type="submit" isLoading={pending}>
                  Create account
                </Button>
              </form>
            </fieldset>

            <p className="mt-4 text-sm text-text-secondary">
              Already have an account?{" "}
              <Link href="/login" className="text-emerald underline-offset-2 hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
