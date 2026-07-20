import type { NotificationRepository } from "@/lib/repositories/notification-repository";
import type { Notification } from "@/lib/notifications-types";

/** Placeholder service boundary — Phase 2.1A foundation only. Future home
 * for notification dispatch rules — explicitly out of scope: push
 * notifications are not part of this phase. */
export class NotificationService {
  constructor(private readonly notifications: NotificationRepository) {}

  async getNotifications(recipientUsername: string): Promise<Notification[]> {
    return this.notifications.listForUser(recipientUsername);
  }

  async markRead(id: string): Promise<void> {
    await this.notifications.markRead(id);
  }
}
