"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Discover", href: "/discover" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Creators", href: "#for-creators" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="glass sticky top-0 z-50 w-full border-b border-border">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="text-lg">Hush</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-fast ease-signal hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Join Free</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/login">Become a Creator</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div
        id="landing-mobile-menu"
        className={cn(
          "overflow-hidden border-t border-border bg-background transition-[max-height] duration-base ease-signal lg:hidden",
          mobileOpen ? "max-h-96" : "max-h-0 border-t-0"
        )}
      >
        <nav className="container flex flex-col gap-1 py-3" aria-label="Primary, mobile">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-fast ease-signal hover:bg-surface-muted hover:text-text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
            <Button variant="ghost" asChild>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Log In
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Join Free
              </Link>
            </Button>
            <Button asChild>
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Become a Creator
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
