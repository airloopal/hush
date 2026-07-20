"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { LandingMockInterface } from "@/components/landing/landing-mock-interface";
import { useRedirectIfSignedIn } from "@/lib/use-demo-session";
import { setSession, homeRouteForRole } from "@/lib/demo-auth";
import { DEMO_CREATOR, DEMO_FAN, findDemoUserByCredentials } from "@/lib/demo-users";
import type { DemoUser } from "@/lib/demo-auth-types";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { ready } = useRedirectIfSignedIn();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | undefined>(undefined);

  function completeLogin(user: DemoUser) {
    setSession(user);
    router.push(homeRouteForRole(user.role));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // No artificial loading state — this is local validation only, it's
    // instant. A real backend call here would need a pending state.
    const user = findDemoUserByCredentials(email, password);
    if (!user) {
      setError("That email and password combination isn't recognized. Try one of the demo accounts below.");
      return;
    }
    setError(undefined);
    completeLogin(user);
  }

  function handleQuickDemo(user: DemoUser, password: string) {
    setEmail(user.email);
    setPassword(password);
    setError(undefined);
    completeLogin(user);
  }

  function comingSoon(label: string) {
    toast({ title: label, description: "This isn't part of the demo yet.", variant: "default" });
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container grid min-h-screen gap-12 py-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-16">
        {/* Left: branding + value proposition + a preview of the product */}
        <div className="hidden flex-col gap-8 lg:flex">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span className="text-lg">Hush</span>
          </Link>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Pay for the conversation.
              <br />
              <span className="text-emerald">Not another subscription.</span>
            </h1>
            <p className="max-w-sm text-text-secondary">
              Sign in to unlock 24 hours of unlimited private text with a creator, or explore
              Hush as a creator managing your own conversations.
            </p>
          </div>
          <LandingMockInterface />
        </div>

        {/* Right: login form + demo access */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-8">
          <div className="flex flex-col gap-1.5 lg:hidden">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
                <MessageCircle className="h-4 w-4" />
              </span>
              Hush
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Log in</CardTitle>
              <CardDescription>Welcome back to Hush.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  error={error}
                />
                <Button type="submit" className="mt-1">
                  Log In
                </Button>
              </form>

              <div className="mt-4 flex flex-col items-start gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => comingSoon("Forgot password")}
                  className="text-text-secondary underline-offset-2 transition-colors duration-fast ease-signal hover:text-text-primary hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => comingSoon("Create Fan Account")}
                  className="text-text-secondary underline-offset-2 transition-colors duration-fast ease-signal hover:text-text-primary hover:underline"
                >
                  Create Fan Account
                </button>
                <button
                  type="button"
                  onClick={() => comingSoon("Become a Creator")}
                  className="text-text-secondary underline-offset-2 transition-colors duration-fast ease-signal hover:text-text-primary hover:underline"
                >
                  Become a Creator
                </button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Explore the Demo
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar alt={DEMO_FAN.displayName} size="md" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">{DEMO_FAN.displayName}</span>
                      <span className="text-xs text-text-muted">{DEMO_FAN.email}</span>
                    </div>
                  </div>
                  <p className="font-mono-data text-xs text-text-muted">Password: HushFan24!</p>
                  <Button variant="outline" size="sm" onClick={() => handleQuickDemo(DEMO_FAN, "HushFan24!")}>
                    Enter Fan Demo
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar alt={DEMO_CREATOR.displayName} size="md" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">{DEMO_CREATOR.displayName}</span>
                      <span className="text-xs text-text-muted">{DEMO_CREATOR.email}</span>
                    </div>
                  </div>
                  <p className="font-mono-data text-xs text-text-muted">Password: HushCreator24!</p>
                  <Button variant="outline" size="sm" onClick={() => handleQuickDemo(DEMO_CREATOR, "HushCreator24!")}>
                    Enter Creator Demo
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
