"use client";

import * as React from "react";
import {
  Camera,
  DollarSign,
  MessagesSquare,
  MessageCircle,
  Sparkles,
  Timer,
  Video,
} from "lucide-react";

import { NavigationBar } from "@/components/navigation-bar";
import { BottomNav } from "@/components/bottom-nav";
import { CreatorCard } from "@/components/creator-card";
import { DashboardCard } from "@/components/dashboard-card";
import { Countdown } from "@/components/countdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/ui/category-pill";
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { useToast } from "@/components/ui/use-toast";
import { formatLastSeen } from "@/lib/utils";

import {
  mockCategories,
  mockChatAccess,
  mockCreators,
  mockDashboardMetrics,
  mockDeadline,
  mockStatuses,
} from "@/lib/mock-data";

const dashboardIcons = [MessagesSquare, Timer, DollarSign, Sparkles];

export default function Home() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = React.useState(mockCategories[2]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <NavigationBar activeHref="/dashboard" user={{ name: "Jordan Blake" }} notificationCount={3} />

      <main className="container flex flex-col gap-14 py-10">
        <section className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Hush design system</h1>
          <p className="max-w-2xl text-text-secondary">
            The reusable UI layer for Hush, a paid-conversation platform spanning gaming, music,
            fitness, lifestyle, expert-advice, and lawful adult (18+) creators. Tokens, layout
            primitives, and components only — every value below is mock data, and no business
            logic, auth, or persistence is wired up here.
          </p>
        </section>

        {/* Color tokens */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Color tokens</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              ["Background", "bg-background border border-border", "Warm white / near-black"],
              ["Surface", "bg-surface-muted border border-border", "Soft grey / charcoal"],
              ["Emerald", "bg-emerald text-emerald-foreground", "Primary, interactive"],
              ["Amber", "bg-amber text-amber-foreground", "Warnings & expiring chats only"],
              ["Violet", "bg-violet text-violet-foreground", "Sponsored boosts only"],
              ["Success", "bg-success text-white", "Status only"],
              ["Danger", "bg-danger text-white", "Status only"],
            ].map(([label, cls, caption]) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div className={`flex h-16 items-end rounded-md p-2 text-xs font-medium ${cls}`}>
                  {label}
                </div>
                <p className="text-[11px] leading-tight text-text-muted">{caption}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Typography */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Typography</h2>
          <div className="flex flex-col gap-1">
            <p className="text-4xl font-semibold tracking-tight">Aa — Geist Sans 4xl</p>
            <p className="text-2xl font-semibold">Aa — Geist Sans 2xl semibold</p>
            <p className="text-base text-text-secondary">Aa — Geist Sans base, secondary text</p>
            <p className="font-mono-data text-xl text-emerald">02:14:36 — Geist Mono, tabular data</p>
          </div>
        </section>

        {/* Buttons */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Buttons</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Unlock access</Button>
            <Button variant="secondary">Save draft</Button>
            <Button variant="outline">View details</Button>
            <Button variant="ghost">Dismiss</Button>
            <Button variant="destructive">End chat</Button>
            <Button variant="link">Learn more</Button>
            <Button isLoading>Processing</Button>
          </div>
        </section>

        {/* Inputs */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Inputs</h2>
          <div className="grid max-w-md gap-4">
            <Input label="Chat topic" placeholder="Vocal warm-up routine" />
            <Input label="Access price" placeholder="$0.00" hint="Charged once for 24 hours of unlimited text." />
            <Input label="Contact email" placeholder="you@example.com" error="Enter a valid email address." />
          </div>
        </section>

        {/* Category pills */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Category pills</h2>
          <div className="flex flex-wrap gap-2">
            {mockCategories.map((category) => (
              <CategoryPill
                key={category}
                variant={category === "18+" ? "amber" : "neutral"}
                selected={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </CategoryPill>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            Selection uses the primary emerald color; the 18+ tag uses the reserved amber
            warning color as a content notice.
          </p>
        </section>

        {/* Status badges */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Status badges</h2>
          <div className="flex flex-wrap gap-2">
            {mockStatuses.map((status: StatusKind) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </section>

        {/* Avatars */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Avatars</h2>
          <div className="flex items-center gap-3">
            <Avatar alt="Maya Okoye" size="sm" online />
            <Avatar alt="Theo Lindqvist" size="md" />
            <Avatar alt="Priya Nandan" size="lg" online />
            <Avatar alt="Jordan Blake" size="xl" />
          </div>
        </section>

        {/* Countdown */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Countdown</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Countdown target={mockDeadline} />
            <Countdown target={mockDeadline} variant="compact" />
          </div>
          <p className="text-xs text-text-muted">
            Ticks in emerald while access is active; switches to amber once a chat is expiring
            soon.
          </p>
        </section>

        {/* Dashboard cards */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Dashboard cards</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mockDashboardMetrics.map((metric, i) => (
              <DashboardCard key={metric.label} {...metric} icon={dashboardIcons[i]} />
            ))}
          </div>
        </section>

        {/* Hush core example: 24-hour paid chat access */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Core example — 24-hour chat access</h2>
          <p className="max-w-2xl text-sm text-text-secondary">
            Hush&apos;s core unit: a creator sells a 24-hour access window with unlimited text
            included, plus separately priced live photo and live video options. Presence and
            the access countdown update automatically.
          </p>
          <Card className="max-w-lg">
            <CardHeader className="flex-row items-center gap-3">
              <Avatar alt={mockChatAccess.creatorName} size="lg" online />
              <div className="flex flex-1 flex-col">
                <span className="font-semibold leading-tight">{mockChatAccess.creatorName}</span>
                <span className="text-sm text-text-secondary">
                  {formatLastSeen(mockChatAccess.lastSeenAt)}
                </span>
              </div>
              <StatusBadge status="live" />
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Access window
                </span>
                <Countdown target={mockChatAccess.expiresAt} />
              </div>

              <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                <div className="flex items-center justify-between p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-text-muted" />
                    24-hour access · unlimited text
                  </span>
                  <span className="font-mono-data text-sm font-semibold">
                    {mockChatAccess.accessPrice}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4 text-text-muted" />
                    Live photo
                  </span>
                  <span className="font-mono-data text-sm font-semibold">
                    +{mockChatAccess.livePhotoPrice}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <Video className="h-4 w-4 text-text-muted" />
                    Live video
                  </span>
                  <span className="font-mono-data text-sm font-semibold">
                    +{mockChatAccess.liveVideoPrice}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() =>
                  toast({
                    title: "Access unlocked",
                    description: "24 hours of unlimited text is now active.",
                    variant: "success",
                  })
                }
              >
                Unlock 24-hour access
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Creator cards */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Creator cards</h2>
          <p className="max-w-2xl text-sm text-text-secondary">
            A broad mix of categories — gaming, music, fitness, lifestyle, and expert advice —
            with a single, clearly labeled lawful-adult (18+) creator alongside them.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mockCreators.map((creator) => (
              <CreatorCard
                key={creator.handle}
                {...creator}
                onView={() => toast({ title: `Opening ${creator.name}'s profile`, variant: "default" })}
              />
            ))}
          </div>
        </section>

        {/* Modal + Toast */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Modal & toast</h2>
          <div className="flex flex-wrap gap-3">
            <Modal>
              <ModalTrigger asChild>
                <Button variant="outline">Open access modal</Button>
              </ModalTrigger>
              <ModalContent>
                <ModalHeader>
                  <ModalTitle>Confirm chat access</ModalTitle>
                  <ModalDescription>
                    This unlocks a mock 24-hour access window. No request is made — this is a
                    UI-layer demo only.
                  </ModalDescription>
                </ModalHeader>
                <ModalFooter>
                  <Button variant="ghost">Cancel</Button>
                  <Button
                    onClick={() =>
                      toast({
                        title: "Access unlocked",
                        description: "Ines Carvalho will be notified.",
                        variant: "success",
                      })
                    }
                  >
                    Unlock access
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Chat expiring soon",
                  description: "This access window ends in 2 hours.",
                  variant: "danger",
                })
              }
            >
              Trigger toast
            </Button>
          </div>
        </section>

        {/* Cards / spacing */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Card + spacing scale</h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Spacing tokens</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[1, 2, 3, 4, 6, 8].map((step) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="w-8 font-mono-data text-xs text-text-muted">{step}</span>
                  <div className="h-2 rounded-sm bg-emerald" style={{ width: `${step * 8}px` }} />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>

      <BottomNav activeHref="/dashboard" />
    </div>
  );
}
