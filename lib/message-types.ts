export type MessageDeliveryState = "sending" | "sent" | "failed";

export interface MessageSummary {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  body: string;
  messageType: "text";
  clientMessageId: string | null;
  createdAt: string;
}

export interface UnreadCount {
  conversationId: string;
  count: number;
}

export interface LastReadState {
  lastReadMessageId: string | null;
  lastReadAt: string;
}

/** A message as rendered in the composer/thread before (and while) it's
 * confirmed by the server — see docs/realtime-messaging.md "Optimistic
 * sending". */
export interface OptimisticMessage extends MessageSummary {
  deliveryState: MessageDeliveryState;
}
