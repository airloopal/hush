"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// href: null marks a link as not built yet — rendered as a clearly labeled
// "Coming Soon" control instead of a dead `#` link, per Stage 5A.2 §11.
const FOOTER_COLUMNS: { title: string; links: { label: string; href: string | null }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: null },
      { label: "Safety", href: "/safety" },
      { label: "Support", href: null },
      { label: "Help Centre", href: null },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: null },
      { label: "Terms", href: null },
      { label: "Creator Terms", href: null },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Log In", href: "/login" },
      { label: "Become a Creator", href: "/login" },
    ],
  },
];

export function LandingFooter() {
  const { toast } = useToast();

  function comingSoon(label: string) {
    toast({ title: label, description: "This page isn't part of the demo yet.", variant: "default" });
  }

  return (
    <footer className="py-14">
      <div className="container flex flex-col gap-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald text-emerald-foreground">
                <MessageCircle className="h-4 w-4" />
              </span>
              Hush
            </Link>
            <p className="max-w-xs text-sm text-text-secondary">
              Pay for the conversation, not another subscription.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {column.title}
                </h3>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {link.href ? (
                        <Link
                          href={link.href}
                          className="text-sm text-text-secondary transition-colors duration-fast ease-signal hover:text-text-primary"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => comingSoon(link.label)}
                          className="text-sm text-text-muted transition-colors duration-fast ease-signal hover:text-text-primary"
                        >
                          {link.label}
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-text-muted">
                            (Coming Soon)
                          </span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Hush. All rights reserved.</span>
          <span>Prototype product — no real payments are processed.</span>
        </div>
      </div>
    </footer>
  );
}
