import {
  Camera,
  LayoutGrid,
  Lock,
  ShieldCheck,
  Smartphone,
  Tags,
  Timer,
  UserCog,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/landing/reveal";

const FEATURES = [
  { icon: Lock, title: "Private messaging", description: "One-to-one conversations, never public." },
  { icon: Timer, title: "24-hour access", description: "A single payment unlocks a full day of chat." },
  { icon: Camera, title: "Live media requests", description: "Photos and videos, purchased only when wanted." },
  { icon: LayoutGrid, title: "Creator dashboard", description: "Track conversations, requests, and earnings." },
  { icon: Tags, title: "Transparent pricing", description: "Every price is set and shown up front." },
  { icon: UserCog, title: "Privacy controls", description: "Manage what's visible about your activity." },
  { icon: ShieldCheck, title: "Trust & Safety", description: "Reporting, blocking, and payment issue tools." },
  { icon: Smartphone, title: "Cross-device experience", description: "Works the same on desktop, tablet, and phone." },
];

export function LandingFeatureGrid() {
  return (
    <section className="border-b border-border py-16 sm:py-20" aria-labelledby="features-heading">
      <div className="container flex flex-col gap-10">
        <Reveal variant="slide-up" className="flex flex-col gap-2">
          <h2 id="features-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything the conversation needs
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} variant="fade" delay={index * 50}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3 p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald/10 text-emerald">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="text-xs text-text-secondary">{description}</p>
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
