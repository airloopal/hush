import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CategoryPill } from "@/components/ui/category-pill";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { LANDING_SHOWCASE_CREATORS } from "@/lib/landing-data";

export function LandingCreatorShowcase() {
  return (
    <section className="border-b border-border py-16 sm:py-20" aria-labelledby="showcase-heading">
      <div className="container flex flex-col gap-8">
        <Reveal variant="slide-up" className="flex flex-col gap-2">
          <h2 id="showcase-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Creators across every category
          </h2>
          <p className="max-w-xl text-text-secondary">
            From gaming to fitness to lawful adult content — every creator sets their own price
            for 24-hour access.
          </p>
        </Reveal>

        <div className="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2">
          {LANDING_SHOWCASE_CREATORS.map((creator, index) => (
            <Reveal
              key={creator.displayName}
              variant="fade"
              delay={index * 40}
              className="w-56 shrink-0"
            >
              <Card className="h-full overflow-hidden transition-transform duration-base ease-signal hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="flex-row items-center gap-3 pb-3">
                  <Avatar alt={creator.displayName} size="lg" online={creator.isOnline} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold leading-tight">
                      {creator.displayName}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {creator.isOnline ? "Online now" : "Offline"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-0">
                  <CategoryPill variant={creator.category === "18+" ? "amber" : "neutral"}>
                    {creator.category}
                  </CategoryPill>
                  <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-text-muted">24h chat</span>
                    <span className="font-mono-data font-semibold text-text-primary">
                      ${creator.chatPrice}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        <div>
          <Button variant="outline" asChild>
            <Link href="/discover">
              Browse all creators
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
