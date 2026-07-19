import { generateId } from "@/lib/id";
import { getAllNotifications, saveAllNotifications } from "@/lib/notifications-storage";
import type { Notification, NotificationType } from "@/lib/notifications-types";

/** Dispatched on every create/read/delete so any mounted component (e.g. the
 * nav bar's unread badge) can refresh without polling or a global store. */
export const NOTIFICATIONS_CHANGED_EVENT = "hush:notifications-changed";

function emitChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export interface CreateNotificationParams {
  type: NotificationType;
  recipientUsername: string;
  title: string;
  description: string;
  relatedId?: string;
}

export function createNotification(params: CreateNotificationParams): Notification {
  const notification: Notification = {
    id: generateId("notif"),
    type: params.type,
    recipientUsername: params.recipientUsername,
    title: params.title,
    description: params.description,
    createdAt: new Date().toISOString(),
    read: false,
    relatedId: params.relatedId,
  };
  saveAllNotifications([...getAllNotifications(), notification]);
  emitChanged();
  return notification;
}

/** Creates a notification of `type`/`relatedId` only if one doesn't already
 * exist for this recipient — used for lazily-detected time-based events
 * (chat expiring soon, chat expired) so reloading a page never duplicates
 * them. */
export function createNotificationOnce(params: CreateNotificationParams): void {
  if (!params.relatedId) {
    createNotification(params);
    return;
  }
  const exists = getAllNotifications().some(
    (n) =>
      n.recipientUsername === params.recipientUsername &&
      n.type === params.type &&
      n.relatedId === params.relatedId
  );
  if (!exists) createNotification(params);
}

export function getNotificationsForUser(recipientUsername: string): Notification[] {
  return getAllNotifications()
    .filter((n) => n.recipientUsername === recipientUsername)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadNotificationCount(recipientUsername: string): number {
  return getAllNotifications().filter((n) => n.recipientUsername === recipientUsername && !n.read).length;
}

export function markNotificationRead(id: string): void {
  const all = getAllNotifications();
  const index = all.findIndex((n) => n.id === id);
  if (index === -1) return;
  const next = [...all];
  next[index] = { ...next[index], read: true };
  saveAllNotifications(next);
  emitChanged();
}

export function markAllNotificationsRead(recipientUsername: string): void {
  const all = getAllNotifications();
  const next = all.map((n) => (n.recipientUsername === recipientUsername ? { ...n, read: true } : n));
  saveAllNotifications(next);
  emitChanged();
}

export function deleteNotification(id: string): void {
  saveAllNotifications(getAllNotifications().filter((n) => n.id !== id));
  emitChanged();
}
