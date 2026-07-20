import { Check } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const FAN_POINTS = [
  "No subscriptions",
  "No memberships",
  "No coins",
  "Transparent pricing",
  "Private conversations",
  "24-hour access",
];

export function LandingForFans() {
  return (
    <section className="border-b border-border py-16 sm:py-20" aria-labelledby="for-fans-heading">
      <div className="container flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <Reveal variant="slide-up" className="flex max-w-md flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-emerald">For fans</span>
          <h2 id="for-fans-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Pay only for what you use
          </h2>
          <p className="text-text-secondary">
            No recurring charges, no confusing coin bundles — just a simple, one-time payment for
            24 hours of unlimited private messaging.
          </p>
        </Reveal>

        <Reveal variant="slide-up" delay={100} className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
          {FAN_POINTS.map((point) => (
            <div key={point} className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 py-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald/10 text-emerald">
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
