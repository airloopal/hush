import Link from "next/link";
import { MessageCircle } from "lucide-react";

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Safety", href: "/settings/safety" },
      { label: "Support", href: "#" },
      { label: "Help Centre", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Creator Terms", href: "#" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Log In", href: "/discover" },
      { label: "Become a Creator", href: "/onboarding/account-type" },
    ],
  },
];

export function LandingFooter() {
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
                      <Link
                        href={link.href}
                        className="text-sm text-text-secondary transition-colors duration-fast ease-signal hover:text-text-primary"
                      >
                        {link.label}
                      </Link>
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
