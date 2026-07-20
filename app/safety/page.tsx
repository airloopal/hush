import Link from "next/link";
import { Flag, ShieldCheck, UserX } from "lucide-react";

import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Card, CardContent } from "@/components/ui/card";

const PRINCIPLES = [
  {
    icon: Flag,
    title: "Report anything, anytime",
    description: "Every conversation has a report option, right from its safety menu.",
  },
  {
    icon: UserX,
    title: "Block instantly",
    description: "Blocking a creator makes the conversation read-only and stops new chat access with them.",
  },
  {
    icon: ShieldCheck,
    title: "Payment issues are tracked",
    description: "Report a payment problem and it's logged against that conversation for review.",
  },
];

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main className="container flex flex-col gap-10 py-16 sm:py-20">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Safety at Hush</h1>
          <p className="max-w-xl text-text-secondary">
            Hush gives fans and creators direct control over their own conversations — reporting,
            blocking, and payment-issue tools are built into every chat.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-3 p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald/10 text-emerald">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="text-xs text-text-secondary">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-2 p-5 text-sm text-text-secondary">
            <p>
              Already signed in? Manage your own blocked creators, reports, and payment issues
              from your{" "}
              <Link href="/settings/safety" className="text-emerald underline-offset-2 hover:underline">
                Safety Centre
              </Link>
              .
            </p>
            <p className="text-xs text-text-muted">
              This is a demo product — reports and payment issues are recorded locally and aren't
              reviewed by a real moderation team yet.
            </p>
          </CardContent>
        </Card>
      </main>
      <LandingFooter />
    </div>
  );
}
