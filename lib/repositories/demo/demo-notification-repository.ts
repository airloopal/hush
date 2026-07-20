import { getNotificationsForUser, markNotificationRead } from "@/lib/notifications";
import type { NotificationRepository } from "@/lib/repositories/notification-repository";

export const demoNotificationRepository: NotificationRepository = {
  async listForUser(recipientUsername) {
    return getNotificationsForUser(recipientUsername);
  },
  async markRead(id) {
    markNotificationRead(id);
  },
};
