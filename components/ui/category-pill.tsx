import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const categoryPillVariants = cva(
  "inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-medium transition-[background-color,color,transform] duration-fast ease-signal",
  {
    variants: {
      // amber = warnings / urgent / expiring-soon tags only.
      // violet = sponsored boost / promo labels only.
      variant: {
        neutral: "bg-surface-muted text-text-secondary",
        amber: "bg-amber/15 text-amber",
        violet: "bg-violet/15 text-violet",
      },
      interactive: {
        true: "cursor-pointer hover:bg-surface-muted/80 border border-transparent",
        false: "",
      },
      // Selection is always shown with the primary interactive color
      // (emerald), regardless of the pill's base variant, plus a subtle
      // scale-up so the change reads as a deliberate, smooth selection.
      selected: {
        true: "scale-105 bg-emerald/15 text-emerald ring-1 ring-inset ring-emerald/40",
        false: "",
      },
    },
    defaultVariants: { variant: "neutral", interactive: false, selected: false },
  }
);

export interface CategoryPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof categoryPillVariants> {
  icon?: React.ReactNode;
}

/**
 * Renders as a <button> when `interactive`/`onClick` is used for filtering,
 * otherwise a plain <span> for read-only display on cards.
 */
const CategoryPill = React.forwardRef<HTMLButtonElement, CategoryPillProps>(
  ({ className, variant, interactive, selected, icon, children, onClick, ...props }, ref) => {
    const isInteractive = interactive || !!onClick;
    const classes = cn(
      categoryPillVariants({ variant, interactive: isInteractive, selected, className })
    );

    if (isInteractive) {
      return (
        <button ref={ref} type="button" className={classes} onClick={onClick} {...props}>
          {icon}
          {children}
        </button>
      );
    }

    return (
      <span className={classes}>
        {icon}
        {children}
      </span>
    );
  }
);
CategoryPill.displayName = "CategoryPill";

export { CategoryPill };
