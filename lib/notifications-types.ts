/**
 * Local-only notification model. There is no push/WebSocket delivery —
 * notifications are created directly by domain actions in this same
 * browser session (e.g. a creator reply, a media fulfillment) or lazily
 * detected on page load (e.g. a chat crossing the "expiring soon"
 * threshold). Nothing is ever sent to or received from a server.
 */

export type NotificationType =
  | "creator-replied"
  | "chat-expiring"
  | "chat-expired"
  | "live-photo-fulfilled"
  | "live-video-fulfilled"
  | "purchase-completed"
  | "report-updated"
  | "payment-issue-updated";

export interface Notification {
  id: string;
  type: NotificationType;
  /** Local account username this notification is for. */
  recipientUsername: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  /** Optional link back to the related session/report/issue, used to
   * de-duplicate lazily-generated notifications (e.g. only one
   * "chat-expiring" notification per session). */
  relatedId?: string;
}
