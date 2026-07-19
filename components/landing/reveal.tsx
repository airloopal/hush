"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: "fade" | "slide-up" | "scale";
  /** Stagger delay in ms, for revealing a sequence of siblings. */
  delay?: number;
  as?: "div" | "li";
}

const VARIANT_CLASS: Record<NonNullable<RevealProps["variant"]>, string> = {
  fade: "animate-fade-in",
  "slide-up": "animate-slide-up",
  scale: "animate-scale-in",
};

/** Reveals children with a subtle animation once scrolled into view.
 * `prefers-reduced-motion` is already respected globally (see
 * app/globals.css), which collapses all animation durations to ~0. */
export function Reveal({ children, className, variant = "slide-up", delay = 0, as = "div" }: RevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Comp = as;

  return (
    <Comp
      ref={ref as React.RefObject<HTMLDivElement & HTMLLIElement>}
      className={cn(!visible && "opacity-0", visible && VARIANT_CLASS[variant], className)}
      style={visible && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Comp>
  );
}
