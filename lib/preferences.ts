import { readStorage, writeStorage } from "@/lib/storage";

export const PREFERENCES_STORAGE_KEYS = {
  privacy: "hush:privacy-settings",
  chat: "hush:chat-preferences",
  notifications: "hush:notification-preferences",
} as const;

export interface PrivacySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  allowChatRenewals: boolean;
  allowCreatorRecommendations: boolean;
}

export interface ChatPreferences {
  enterToSend: boolean;
  showTimestamps: boolean;
  compactSpacing: boolean;
  autoScroll: boolean;
}

export interface NotificationPreferences {
  notifyOnCreatorReply: boolean;
  notifyOnExpiryWarning: boolean;
  notifyOnMediaFulfilled: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  showOnlineStatus: true,
  showLastSeen: true,
  allowChatRenewals: true,
  allowCreatorRecommendations: true,
};

const DEFAULT_CHAT_PREFERENCES: ChatPreferences = {
  enterToSend: true,
  showTimestamps: true,
  compactSpacing: false,
  autoScroll: true,
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notifyOnCreatorReply: true,
  notifyOnExpiryWarning: true,
  notifyOnMediaFulfilled: true,
};

/** Merges stored booleans over the defaults so a partial/malformed/older
 * shape never crashes and unknown keys are ignored. */
function readBooleanSettings<T extends object>(key: string, defaults: T): T {
  const raw = readStorage<unknown>(key);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const result: Record<string, boolean> = { ...(defaults as Record<string, boolean>) };
  for (const field of Object.keys(defaults)) {
    const value = (raw as Record<string, unknown>)[field];
    if (typeof value === "boolean") result[field] = value;
  }
  return result as T;
}

export function getPrivacySettings(): PrivacySettings {
  return readBooleanSettings<PrivacySettings>(PREFERENCES_STORAGE_KEYS.privacy, DEFAULT_PRIVACY);
}

export function savePrivacySettings(settings: PrivacySettings): void {
  writeStorage(PREFERENCES_STORAGE_KEYS.privacy, settings);
}

export function getChatPreferences(): ChatPreferences {
  return readBooleanSettings<ChatPreferences>(PREFERENCES_STORAGE_KEYS.chat, DEFAULT_CHAT_PREFERENCES);
}

export function saveChatPreferences(settings: ChatPreferences): void {
  writeStorage(PREFERENCES_STORAGE_KEYS.chat, settings);
}

export function getNotificationPreferences(): NotificationPreferences {
  return readBooleanSettings<NotificationPreferences>(
    PREFERENCES_STORAGE_KEYS.notifications,
    DEFAULT_NOTIFICATION_PREFERENCES
  );
}

export function saveNotificationPreferences(settings: NotificationPreferences): void {
  writeStorage(PREFERENCES_STORAGE_KEYS.notifications, settings);
}
