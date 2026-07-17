"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
} as const;

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string;
  alt: string;
  /** Fallback initials, e.g. "JD". Derived from `alt` if omitted. */
  initials?: string;
  size?: keyof typeof sizeMap;
  /** Small dot indicating live/online status. */
  online?: boolean;
}

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, src, alt, initials, size = "md", online, ...props }, ref) => {
    const fallback =
      initials ??
      alt
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
      <span className="relative inline-flex shrink-0">
        <AvatarPrimitive.Root
          ref={ref}
          className={cn(
            "flex shrink-0 overflow-hidden rounded-full bg-surface-muted",
            sizeMap[size],
            className
          )}
          {...props}
        >
          <AvatarPrimitive.Image src={src} alt={alt} className="h-full w-full object-cover" />
          <AvatarPrimitive.Fallback
            delayMs={src ? 300 : 0}
            className="flex h-full w-full items-center justify-center bg-emerald/12 font-medium text-emerald"
          >
            {fallback}
          </AvatarPrimitive.Fallback>
        </AvatarPrimitive.Root>
        {online && (
          <span
            className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface"
            aria-label="Online"
          />
        )}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
