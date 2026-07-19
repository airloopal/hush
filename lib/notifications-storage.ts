import { readStorage, writeStorage } from "@/lib/storage";
import type { Notification, NotificationType } from "@/lib/notifications-types";

export const NOTIFICATIONS_STORAGE_KEY = "hush:notifications";

const NOTIFICATION_TYPES: NotificationType[] = [
  "creator-replied",
  "chat-expiring",
  "chat-expired",
  "live-photo-fulfilled",
  "live-video-fulfilled",
  "report-updated",
  "payment-issue-updated",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidNotification(value: unknown): value is Notification {
  if (!value || typeof value !== "object") return false;
  const n = value as Record<string, unknown>;
  return (
    isNonEmptyString(n.id) &&
    typeof n.type === "string" &&
    NOTIFICATION_TYPES.includes(n.type as NotificationType) &&
    isNonEmptyString(n.recipientUsername) &&
    isNonEmptyString(n.title) &&
    typeof n.description === "string" &&
    isValidIsoDate(n.createdAt) &&
    typeof n.read === "boolean" &&
    (n.relatedId === undefined || isNonEmptyString(n.relatedId))
  );
}

export function getAllNotifications(): Notification[] {
  const raw = readStorage<unknown>(NOTIFICATIONS_STORAGE_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidNotification);
}

export function saveAllNotifications(notifications: Notification[]): void {
  writeStorage(NOTIFICATIONS_STORAGE_KEY, notifications);
}
