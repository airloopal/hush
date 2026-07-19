import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { LandingMockInterface } from "@/components/landing/landing-mock-interface";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Subtle glass glow — no gradients on text or buttons, purely an ambient backdrop accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald/10 blur-3xl"
      />
      <div className="container relative flex flex-col items-center gap-14 py-16 lg:flex-row lg:items-center lg:gap-10 lg:py-24">
        <div className="flex max-w-xl flex-col items-start gap-6 text-left">
          <Reveal variant="fade">
            <span className="inline-flex items-center rounded-pill border border-border bg-surface-muted/60 px-3 py-1 text-xs font-medium text-text-secondary">
              A new way to pay creators for their time
            </span>
          </Reveal>

          <Reveal variant="slide-up" delay={80}>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Pay for the conversation.
              <br />
              <span className="text-emerald">Not another subscription.</span>
            </h1>
          </Reveal>

          <Reveal variant="slide-up" delay={140}>
            <p className="text-lg text-text-secondary">
              Unlock 24 hours of unlimited private text with creators. Purchase live photos and
              videos separately, only when you want them, during your conversation.
            </p>
          </Reveal>

          <Reveal variant="slide-up" delay={200} className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/discover">
                Explore Creators
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/onboarding/account-type">Become a Creator</Link>
            </Button>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={120} className="flex w-full justify-center lg:w-auto">
          <LandingMockInterface />
        </Reveal>
      </div>
    </section>
  );
}
