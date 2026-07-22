import { getRepositories } from "@/lib/repositories";
import { ProfileService } from "@/lib/services/profile-service";
import { CreatorService } from "@/lib/services/creator-service";
import { ConversationService } from "@/lib/services/conversation-service";
import { MessagingService } from "@/lib/services/messaging-service";
import { PurchaseService } from "@/lib/services/purchase-service";
import { NotificationService } from "@/lib/services/notification-service";

export {
  ProfileService,
  CreatorService,
  ConversationService,
  MessagingService,
  PurchaseService,
  NotificationService,
};

/**
 * Convenience factory wiring every placeholder service to the current
 * repository set. Nothing in the app calls this yet — it exists so a
 * future feature can start from `const services = getServices();` instead
 * of wiring each service by hand.
 */
export function getServices() {
  const repositories = getRepositories();
  return {
    profiles: new ProfileService(repositories.profiles),
    creators: new CreatorService(repositories.creators),
    conversations: new ConversationService(repositories.conversations, repositories.conversationSessions),
    messaging: new MessagingService(repositories.messages),
    purchases: new PurchaseService(repositories.purchases),
    notifications: new NotificationService(repositories.notifications),
  };
}
