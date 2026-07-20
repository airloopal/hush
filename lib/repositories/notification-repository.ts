import type { Notification } from "@/lib/notifications-types";

/** Placeholder repository interface — Phase 2.1A foundation only. */
export interface NotificationRepository {
  listForUser(recipientUsername: string): Promise<Notification[]>;
  markRead(id: string): Promise<void>;
}
