import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class strings safely (handles conflicting utilities). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pure display formatting for a "last seen" timestamp — e.g. "Active now"
 * or "Last seen 12m ago". Takes a timestamp in, returns a string; it does
 * not track or poll presence itself.
 */
export function formatLastSeen(date: string | Date): string {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (minutes < 2) return "Active now";
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}

/**
 * Same idea as formatLastSeen but for mock creator data where presence is
 * stored as a plain lastSeenMinutes/isOnline pair rather than a timestamp.
 */
export function formatPresence(isOnline: boolean, lastSeenMinutes: number): string {
  if (isOnline) return "Active now";
  if (lastSeenMinutes < 60) return `Last seen ${lastSeenMinutes}m ago`;
  const hours = Math.floor(lastSeenMinutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}
