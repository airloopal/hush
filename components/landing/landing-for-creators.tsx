import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";

const CREATOR_POINTS = [
  "Choose your own prices",
  "Earn from conversations",
  "Sell live media separately",
  "Manage requests",
  "View earnings",
];

export function LandingForCreators() {
  return (
    <section
      id="for-creators"
      className="border-b border-border bg-surface-muted/40 py-16 sm:py-20"
      aria-labelledby="for-creators-heading"
    >
      <div className="container flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <Reveal variant="slide-up" className="flex max-w-md flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-violet">For creators</span>
          <h2 id="for-creators-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Set your price. Keep your time.
          </h2>
          <p className="text-text-secondary">
            Hush is built around your terms — price your own 24-hour access, sell live media as
            an optional add-on, and manage every request from one dashboard.
          </p>
          <div>
            <Button asChild>
              <Link href="/login">
                Become a Creator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal variant="slide-up" delay={100} className="flex w-full max-w-md flex-col gap-3">
          {CREATOR_POINTS.map((point) => (
            <div
              key={point}
              className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 py-3"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-sm font-medium text-text-primary">{point}</span>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
