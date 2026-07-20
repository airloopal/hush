import { Compass, MessageCircle, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";

const STEPS = [
  {
    icon: Compass,
    title: "Find a creator",
    description: "Browse creator profiles across every category.",
  },
  {
    icon: MessageCircle,
    title: "Unlock chat",
    description: "One payment gives you 24 hours of unlimited messaging.",
  },
  {
    icon: Camera,
    title: "Request live media",
    description: "Purchase live photos or videos only when you want them.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="border-b border-border py-16 sm:py-20" aria-labelledby="how-it-works-heading">
      <div className="container flex flex-col gap-10">
        <Reveal variant="slide-up" className="flex flex-col gap-2">
          <h2 id="how-it-works-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="max-w-xl text-text-secondary">Three steps, no subscriptions.</p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} variant="slide-up" delay={index * 100}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-4 p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald/10 font-mono-data text-sm font-semibold text-emerald">
                    {index + 1}
                  </span>
                  <Icon className="h-5 w-5 text-text-muted" aria-hidden="true" />
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-text-secondary">{description}</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
