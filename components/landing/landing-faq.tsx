"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "How does Hush work?",
    answer:
      "Browse creator profiles, then pay once to unlock 24 hours of unlimited private text with a creator. Live photos and videos are optional extras you can request separately during that conversation.",
  },
  {
    question: "How long does chat last?",
    answer: "Every unlock gives you 24 hours of unlimited messaging, starting the moment you pay.",
  },
  {
    question: "Are photos included?",
    answer:
      "No. Live photos and videos are purchased separately, on top of chat access, only when you want them.",
  },
  {
    question: "Can creators set prices?",
    answer: "Yes — every creator sets their own price for chat access, live photos, and live video.",
  },
  {
    question: "Can I report users?",
    answer: "Yes. Any conversation can be reported directly from its safety menu.",
  },
  {
    question: "Can I block creators?",
    answer: "Yes. Blocking a creator makes the conversation read-only and prevents new chat access with them.",
  },
  {
    question: "Is Hush subscription-based?",
    answer: "No. There are no subscriptions, memberships, or coin bundles — just one-time, transparent payments.",
  },
];

export function LandingFaq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <section className="border-b border-border py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="container flex flex-col gap-8">
        <Reveal variant="slide-up">
          <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
        </Reveal>

        <Reveal variant="slide-up" delay={80} className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;
            return (
              <div key={faq.question}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-text-primary transition-colors duration-fast ease-signal hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-inset"
                  >
                    {faq.question}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast ease-signal",
                        isOpen && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={cn("grid transition-[grid-template-rows] duration-base ease-signal", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-text-secondary">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
