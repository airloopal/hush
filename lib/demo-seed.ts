import { readStorage, writeStorage } from "@/lib/storage";
import { generateId } from "@/lib/id";
import { MOCK_CREATORS } from "@/lib/creators";
import {
  getAllSessions,
  saveAllSessions,
  getAllMessages,
  saveAllMessages,
  getAllMediaPurchases,
  saveAllMediaPurchases,
  saveBlockedCreators,
} from "@/lib/chat-storage";
import { getAllReports, saveAllReports, getAllPaymentIssues, saveAllPaymentIssues } from "@/lib/trust-storage";
import { getAllNotifications, saveAllNotifications } from "@/lib/notifications-storage";
import { writeDiscoverFilters } from "@/lib/discover-session";
import type {
  ChatMessage,
  ChatMessageType,
  ChatSession,
  MediaPurchase,
  MediaType,
  SenderRole,
} from "@/lib/chat-types";
import type { BlockedCreator, PaymentIssue, PaymentIssueType, Report, ReportReason } from "@/lib/trust-types";
import type { Notification, NotificationType } from "@/lib/notifications-types";

/**
 * Stage 5A.3 — Seed the Demo Platform.
 *
 * This module ONLY writes data into the storage models that already exist
 * (ChatSession, ChatMessage, MediaPurchase, Report, PaymentIssue,
 * BlockedCreator, Notification) via their existing storage functions. It
 * does not introduce a parallel data model, and it does not touch any page
 * or component — every screen that already reads this data (Chats,
 * Dashboard, Notifications, Purchases, Safety Centre) picks it up
 * automatically once seeded.
 *
 * Runs once (see hush:demo-seeded below) so repeated demo logins never
 * duplicate records. A production build would delete this entire module —
 * real accounts start with real, empty history.
 */

const FAN_USERNAME = "alexm";
const CREATOR_USERNAME = "mayaokoye";
const SEEDED_FLAG_KEY = "hush:demo-seeded";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function creatorById(username: string) {
  const creator = MOCK_CREATORS.find((c) => c.username === username);
  if (!creator) throw new Error(`Demo seed: unknown creator username "${username}"`);
  return creator;
}

function txnRef(n: number): string {
  return `TXN-DEMO${String(n).padStart(4, "0")}`;
}

function isoHoursAgo(hours: number, from: number): string {
  return new Date(from - hours * HOUR_MS).toISOString();
}

function isoDaysAgo(days: number, from: number): string {
  return new Date(from - days * DAY_MS).toISOString();
}

function addMinutesIso(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Session builder
// ---------------------------------------------------------------------------

interface SessionSpec {
  id: string;
  creatorUsername: string;
  fanUsername: string;
  startedHoursAgo: number;
  durationHours?: number;
  txn: number;
}

function buildSession(spec: SessionSpec, now: number): ChatSession {
  const creator = creatorById(spec.creatorUsername);
  const startedAt = isoHoursAgo(spec.startedHoursAgo, now);
  const expiresAt = new Date(new Date(startedAt).getTime() + (spec.durationHours ?? 24) * HOUR_MS).toISOString();
  return {
    id: spec.id,
    creatorId: creator.id,
    creatorUsername: spec.creatorUsername,
    fanUsername: spec.fanUsername,
    startedAt,
    expiresAt,
    transactionRef: txnRef(spec.txn),
    chatPrice: creator.chatPrice,
  };
}

// ---------------------------------------------------------------------------
// Message builder
// ---------------------------------------------------------------------------

let messageCounter = 0;
function msg(
  session: ChatSession,
  senderRole: SenderRole,
  senderUsername: string,
  body: string,
  offsetMinutes: number,
  type: ChatMessageType = "text"
): ChatMessage {
  messageCounter += 1;
  return {
    id: generateId(`demo-msg-${messageCounter}`),
    sessionId: session.id,
    senderRole,
    senderUsername,
    body,
    sentAt: addMinutesIso(session.startedAt, offsetMinutes),
    type,
  };
}

function unlockMessage(session: ChatSession): ChatMessage {
  return msg(session, "system", "hush", "24-hour chat access unlocked.", 0, "system");
}

// ---------------------------------------------------------------------------
// Media purchase builder
// ---------------------------------------------------------------------------

let purchaseCounter = 0;
function purchase(
  session: ChatSession,
  mediaType: MediaType,
  status: MediaPurchase["status"],
  offsetMinutes: number
): { purchase: MediaPurchase; messages: ChatMessage[] } {
  purchaseCounter += 1;
  const creator = creatorById(session.creatorUsername);
  const price = mediaType === "photo" ? creator.photoPrice : creator.videoPrice;
  const requestedAt = addMinutesIso(session.startedAt, offsetMinutes);

  const record: MediaPurchase = {
    id: generateId(`demo-media-${purchaseCounter}`),
    sessionId: session.id,
    creatorUsername: session.creatorUsername,
    fanUsername: session.fanUsername,
    mediaType,
    price,
    status,
    requestedAt,
  };

  const requestedMsg = msg(
    session,
    "system",
    "hush",
    mediaType === "photo" ? "Live photo requested." : "Live video requested.",
    offsetMinutes,
    "media-request"
  );

  const messages = [requestedMsg];

  if (status === "fulfilled") {
    messages.push(
      msg(
        session,
        "system",
        "hush",
        mediaType === "photo"
          ? "Live photo marked as delivered. Prototype only — no real file was sent."
          : "Live video marked as delivered. Prototype only — no real file was sent.",
        offsetMinutes + 6,
        "media-request"
      )
    );
  } else if (status === "dismissed") {
    messages.push(
      msg(
        session,
        "system",
        "hush",
        mediaType === "photo" ? "Live photo request dismissed." : "Live video request dismissed.",
        offsetMinutes + 6,
        "media-request"
      )
    );
  }

  return { purchase: record, messages };
}

// ---------------------------------------------------------------------------
// Notification builder
// ---------------------------------------------------------------------------

let notifCounter = 0;
function notification(params: {
  type: NotificationType;
  title: string;
  description: string;
  hoursAgo: number;
  read: boolean;
  relatedId?: string;
  now: number;
}): Notification {
  notifCounter += 1;
  return {
    id: generateId(`demo-notif-${notifCounter}`),
    type: params.type,
    recipientUsername: FAN_USERNAME,
    title: params.title,
    description: params.description,
    createdAt: isoHoursAgo(params.hoursAgo, params.now),
    read: params.read,
    relatedId: params.relatedId,
  };
}

// ---------------------------------------------------------------------------
// Fictional fan usernames for Maya's non-Alex conversations. These aren't
// real local accounts — ChatSession only ever needs a username string, and
// the dashboard renders them the same way it would any fan.
// ---------------------------------------------------------------------------

const EXTRA_ACTIVE_FANS = [
  "jordan_b", "taylor_k", "morgan_lee", "casey_rivera", "sam_okafor",
  "riley_chen", "drew_hansen", "avery_kim", "jamie_ortiz", "quinn_baxter",
  "reese_donovan", "harper_singh", "blake_torres", "skyler_reyes",
];
const EXTRA_EXPIRED_FANS = [
  "logan_pierce", "elliot_moss", "nico_valdez", "parker_reyes", "finley_cruz", "rowan_michaels",
];

const FILLER_OPENERS = [
  "Hey! Really glad I unlocked this, been wanting to chat for a while.",
  "Hi! Loved your latest post — had to come say hello properly.",
  "Hey, excited to finally have a real conversation instead of just liking posts.",
  "Hi there! Hope today's treating you well.",
  "Hey! Quick question I've been meaning to ask.",
  "Hi! Just unlocked — happy to be here.",
];
const FILLER_REPLIES = [
  "Hey! So glad you're here, thanks for unlocking 🌿",
  "Hi! Always nice meeting someone new here.",
  "Hey there, thanks for the support — what's on your mind?",
  "Hi! Ask away, happy to chat.",
  "Hey! Good timing, was just about to take a break.",
  "Hi, thanks for jumping in — how's your week going?",
];
const FILLER_FOLLOWUPS = [
  "That makes sense, appreciate you explaining it.",
  "Ha, I figured as much. Thanks for the honesty.",
  "Good to know — I'll keep that in mind.",
  "Appreciate you taking the time to reply.",
  "That's really helpful, thank you.",
];

function fillerConversation(session: ChatSession, seed: number): ChatMessage[] {
  const opener = FILLER_OPENERS[seed % FILLER_OPENERS.length];
  const reply = FILLER_REPLIES[(seed + 1) % FILLER_REPLIES.length];
  const followup = FILLER_FOLLOWUPS[(seed + 2) % FILLER_FOLLOWUPS.length];
  return [
    unlockMessage(session),
    msg(session, "fan", session.fanUsername, opener, 2),
    msg(session, "creator", session.creatorUsername, reply, 14),
    msg(session, "fan", session.fanUsername, followup, 26),
  ];
}

// ---------------------------------------------------------------------------
// Main seed entry point
// ---------------------------------------------------------------------------

export function seedDemoDataIfNeeded(): void {
  if (readStorage<boolean>(SEEDED_FLAG_KEY) === true) return;

  const now = Date.now();
  messageCounter = 0;
  purchaseCounter = 0;
  notifCounter = 0;

  const sessions: ChatSession[] = [];
  const messages: ChatMessage[] = [];
  const purchases: MediaPurchase[] = [];

  // -------------------------------------------------------------------
  // Alex's 5 sessions (3 active — one of them expiring soon — + 2 expired)
  // -------------------------------------------------------------------

  const sMaya = buildSession(
    { id: "demo-s-maya", creatorUsername: "mayaokoye", fanUsername: FAN_USERNAME, startedHoursAgo: 5, txn: 1 },
    now
  );
  const sTheo = buildSession(
    { id: "demo-s-theo", creatorUsername: "theolinds", fanUsername: FAN_USERNAME, startedHoursAgo: 9, txn: 2 },
    now
  );
  const sInes = buildSession(
    { id: "demo-s-ines", creatorUsername: "inescarvalho", fanUsername: FAN_USERNAME, startedHoursAgo: 23.33, txn: 3 },
    now
  );
  const sPixel = buildSession(
    { id: "demo-s-pixel", creatorUsername: "pixel_priya", fanUsername: FAN_USERNAME, startedHoursAgo: 50, txn: 4 },
    now
  );
  const sBeats = buildSession(
    { id: "demo-s-beats", creatorUsername: "beatsbyremy", fanUsername: FAN_USERNAME, startedHoursAgo: 140, txn: 5 },
    now
  );
  const sElle = buildSession(
    { id: "demo-s-elle", creatorUsername: "styledby_elle", fanUsername: FAN_USERNAME, startedHoursAgo: 200, txn: 6 },
    now
  );
  sessions.push(sMaya, sTheo, sInes, sPixel, sBeats, sElle);

  // Maya — the shared conversation. Rich thread: photo fulfilled, video pending.
  messages.push(
    unlockMessage(sMaya),
    msg(sMaya, "fan", FAN_USERNAME, "Hey Maya! Loved your morning routine post, following along for real now.", 3),
    msg(sMaya, "creator", "mayaokoye", "Ahh thank you! That one took way too many takes 😄 what part are you trying first?", 11),
    msg(sMaya, "fan", FAN_USERNAME, "The 10-minute reset before bed. Also — any chance I could get a quick photo of your workspace?", 18)
  );
  {
    const { purchase: p, messages: m } = purchase(sMaya, "photo", "fulfilled", 19);
    purchases.push(p);
    messages.push(...m);
  }
  messages.push(
    msg(sMaya, "creator", "mayaokoye", "There you go — still a work in progress but I love it in the mornings.", 26),
    msg(sMaya, "fan", FAN_USERNAME, "That's so satisfying, thank you! One more thing — could I get a quick video walkthrough of your plant shelf?", 34)
  );
  {
    const { purchase: p, messages: m } = purchase(sMaya, "video", "requested", 35);
    purchases.push(p);
    messages.push(...m);
  }
  messages.push(msg(sMaya, "creator", "mayaokoye", "Yes! Let me finish tidying first, I'll send it over soon.", 41));

  // Theo — gaming, pending photo request.
  messages.push(
    unlockMessage(sTheo),
    msg(sTheo, "fan", FAN_USERNAME, "Are you still doing co-op runs tonight?", 2),
    msg(sTheo, "creator", "theolinds", "Yep, queueing up in like 20. You bring the good builds this time?", 9),
    msg(sTheo, "fan", FAN_USERNAME, "Always. Can I get a photo of your setup btw, curious about your monitor arm.", 15)
  );
  {
    const { purchase: p, messages: m } = purchase(sTheo, "photo", "requested", 16);
    purchases.push(p);
    messages.push(...m);
  }
  messages.push(msg(sTheo, "creator", "theolinds", "Sure, give me a minute between matches.", 22));

  // Ines — expiring soon, video fulfilled quickly.
  messages.push(
    unlockMessage(sInes),
    msg(sInes, "fan", FAN_USERNAME, "Quick one before this expires — could you send a video of that chord progression you mentioned?", 4)
  );
  {
    const { purchase: p, messages: m } = purchase(sInes, "video", "requested", 5);
    purchases.push(p);
    messages.push(...m);
  }
  messages.push(
    msg(sInes, "creator", "inescarvalho", "Of course, recording it now.", 9),
    msg(
      sInes,
      "system",
      "hush",
      "Live video marked as delivered. Prototype only — no real file was sent.",
      20,
      "media-request"
    )
  );
  purchases[purchases.length - 1].status = "fulfilled";
  messages.push(msg(sInes, "fan", FAN_USERNAME, "Perfect, exactly what I needed for practice tonight.", 25));

  // Pixel Priya — expired, declined photo request.
  messages.push(
    unlockMessage(sPixel),
    msg(sPixel, "fan", FAN_USERNAME, "Any tips for the frame-perfect skip in world 4?", 3),
    msg(
      sPixel,
      "creator",
      "pixel_priya",
      "Oh that one's brutal — you gotta buffer the jump 2 frames early. Could send a photo of the input display if that'd help?",
      10
    )
  );
  {
    const { purchase: p, messages: m } = purchase(sPixel, "photo", "dismissed", 11);
    purchases.push(p);
    messages.push(...m);
  }
  messages.push(
    msg(sPixel, "creator", "pixel_priya", "Actually, simpler to just explain: buffer 2 frames, release right before the ledge.", 19),
    msg(sPixel, "fan", FAN_USERNAME, "That worked! Finally cleared it, thank you.", 40)
  );

  // Beats by Remy — expired, video requested but never resolved.
  messages.push(
    unlockMessage(sBeats),
    msg(sBeats, "fan", FAN_USERNAME, "Could I get your take on this 8-bar loop I've been stuck on?", 5),
    msg(sBeats, "creator", "beatsbyremy", "Send it my way when you get a chance.", 40),
    msg(
      sBeats,
      "fan",
      FAN_USERNAME,
      "Here's the reference — also would love a quick video of your mixing chain if you have time.",
      55
    )
  );
  {
    const { purchase: p, messages: m } = purchase(sBeats, "video", "requested", 56);
    purchases.push(p); // stays "requested" — an expired, unresolved request
    messages.push(...m);
  }

  // Elle — expired, Fashion, a clean fully-resolved conversation.
  messages.push(
    unlockMessage(sElle),
    msg(sElle, "fan", FAN_USERNAME, "I've got a wedding in a few weeks and no idea what to wear. Help?", 4),
    msg(sElle, "creator", "styledby_elle", "Ooh exciting! What's the dress code, and do you already own a go-to blazer?", 12),
    msg(sElle, "fan", FAN_USERNAME, "Cocktail attire, and yes — a navy one. Could I get a photo of a few pairing ideas?", 18)
  );
  {
    const { purchase: p, messages: m } = purchase(sElle, "photo", "fulfilled", 19);
    purchases.push(p);
    messages.push(...m);
  }
  messages.push(
    msg(sElle, "creator", "styledby_elle", "Sent! Try it with a cream shirt instead of white, much warmer for evening light.", 27),
    msg(sElle, "fan", FAN_USERNAME, "That's such a good call, thank you — exactly what I needed.", 35)
  );

  // -------------------------------------------------------------------
  // Maya's other conversations (14 active + 6 expired, fictional fans)
  // Distribution: 6 active get 1 fulfilled each, 7 active get 1 pending
  // each, 1 active gets a dismissed one; 6 expired get 2–3 fulfilled each.
  // Combined with the shared Maya/Alex thread above (1 fulfilled + 1
  // pending), totals land on exactly 8 pending / 24 fulfilled.
  // -------------------------------------------------------------------

  const FULFILLED_ACTIVE_COUNT = 6;
  const PENDING_ACTIVE_COUNT = 7;
  let extraTxn = 100;

  EXTRA_ACTIVE_FANS.forEach((fan, index) => {
    const session = buildSession(
      {
        id: `demo-s-active-${index}`,
        creatorUsername: CREATOR_USERNAME,
        fanUsername: fan,
        startedHoursAgo: 1 + index * 1.3,
        txn: extraTxn++,
      },
      now
    );
    sessions.push(session);
    messages.push(...fillerConversation(session, index));

    if (index < FULFILLED_ACTIVE_COUNT) {
      const mediaType: MediaType = index % 2 === 0 ? "photo" : "video";
      const { purchase: p, messages: m } = purchase(session, mediaType, "fulfilled", 30);
      purchases.push(p);
      messages.push(...m);
    } else if (index < FULFILLED_ACTIVE_COUNT + PENDING_ACTIVE_COUNT) {
      const mediaType: MediaType = index % 2 === 0 ? "video" : "photo";
      const { purchase: p, messages: m } = purchase(session, mediaType, "requested", 30);
      purchases.push(p);
      messages.push(...m);
    } else {
      const { purchase: p, messages: m } = purchase(session, "photo", "dismissed", 30);
      purchases.push(p);
      messages.push(...m);
    }
  });

  const expiredFulfilledCounts = [3, 3, 3, 3, 3, 2]; // sums to 17
  EXTRA_EXPIRED_FANS.forEach((fan, index) => {
    const session = buildSession(
      {
        id: `demo-s-expired-${index}`,
        creatorUsername: CREATOR_USERNAME,
        fanUsername: fan,
        startedHoursAgo: 48 + index * 120, // spread across the last ~1 month
        txn: extraTxn++,
      },
      now
    );
    sessions.push(session);
    messages.push(...fillerConversation(session, index + 20));

    const count = expiredFulfilledCounts[index];
    for (let i = 0; i < count; i += 1) {
      const mediaType: MediaType = i % 2 === 0 ? "photo" : "video";
      const { purchase: p, messages: m } = purchase(session, mediaType, "fulfilled", 30 + i * 15);
      purchases.push(p);
      messages.push(...m);
    }
  });

  // Returning fan: jordan_b (already has an active session above) also had
  // an earlier expired one with Maya — gives the fan-return-rate metric a
  // believable, non-zero value instead of every fan being brand new.
  const sJordanReturn = buildSession(
    {
      id: "demo-s-jordan-return",
      creatorUsername: CREATOR_USERNAME,
      fanUsername: "jordan_b",
      startedHoursAgo: 400,
      txn: extraTxn++,
    },
    now
  );
  sessions.push(sJordanReturn);
  messages.push(...fillerConversation(sJordanReturn, 1));
  {
    const { purchase: p, messages: m } = purchase(sJordanReturn, "photo", "fulfilled", 30);
    purchases.push(p);
    messages.push(...m);
  }

  saveAllSessions([...getAllSessions(), ...sessions]);
  saveAllMessages([...getAllMessages(), ...messages]);
  saveAllMediaPurchases([...getAllMediaPurchases(), ...purchases]);

  // -------------------------------------------------------------------
  // Blocked creator (Alex blocks someone he isn't actively chatting with)
  // -------------------------------------------------------------------
  const blocked: BlockedCreator[] = [{ creatorUsername: "courtside_jamal", blockedAt: isoDaysAgo(9, now) }];
  saveBlockedCreators(blocked);

  // -------------------------------------------------------------------
  // Reports (resolved / open / closed)
  // -------------------------------------------------------------------
  const reports: Report[] = [
    {
      id: generateId("demo-report"),
      creatorUsername: "mayaokoye",
      fanUsername: FAN_USERNAME,
      conversationId: sMaya.id,
      reason: "other" as ReportReason,
      notes: "Wrong price briefly showed on the profile page — since corrected.",
      createdAt: isoDaysAgo(6, now),
      status: "resolved",
    },
    {
      id: generateId("demo-report"),
      creatorUsername: "theolinds",
      fanUsername: FAN_USERNAME,
      conversationId: sTheo.id,
      reason: "spam" as ReportReason,
      notes: "Kept sending the same promo message a few times in a row.",
      createdAt: isoDaysAgo(2, now),
      status: "open",
    },
    {
      id: generateId("demo-report"),
      creatorUsername: "pixel_priya",
      fanUsername: FAN_USERNAME,
      conversationId: sPixel.id,
      reason: "other" as ReportReason,
      notes: "Turned out to be a misunderstanding, closing this out.",
      createdAt: isoDaysAgo(20, now),
      status: "closed",
    },
  ];
  saveAllReports([...getAllReports(), ...reports]);

  // -------------------------------------------------------------------
  // Payment issues (resolved / pending-review / open)
  // -------------------------------------------------------------------
  const paymentIssues: PaymentIssue[] = [
    {
      id: generateId("demo-issue"),
      creatorUsername: "theolinds",
      fanUsername: FAN_USERNAME,
      conversationId: sTheo.id,
      type: "incorrect-charge" as PaymentIssueType,
      createdAt: isoDaysAgo(7, now),
      status: "resolved",
    },
    {
      id: generateId("demo-issue"),
      creatorUsername: "beatsbyremy",
      fanUsername: FAN_USERNAME,
      conversationId: sBeats.id,
      type: "chat-expired-unexpectedly" as PaymentIssueType,
      createdAt: isoDaysAgo(5, now),
      status: "pending-review",
    },
    {
      id: generateId("demo-issue"),
      creatorUsername: "pixel_priya",
      fanUsername: FAN_USERNAME,
      conversationId: sPixel.id,
      type: "media-not-received" as PaymentIssueType,
      createdAt: isoDaysAgo(3, now),
      status: "open",
    },
    {
      id: generateId("demo-issue"),
      creatorUsername: CREATOR_USERNAME,
      fanUsername: FAN_USERNAME,
      conversationId: sMaya.id,
      type: "other" as PaymentIssueType,
      createdAt: isoDaysAgo(4, now),
      status: "open",
    },
  ];
  saveAllPaymentIssues([...getAllPaymentIssues(), ...paymentIssues]);

  // -------------------------------------------------------------------
  // Notifications — mixed read/unread, covering every type
  // -------------------------------------------------------------------
  const notifications: Notification[] = [
    notification({ type: "creator-replied", title: "Creator replied", description: "@mayaokoye sent you a message.", hoursAgo: 4, read: false, relatedId: sMaya.id, now }),
    notification({ type: "creator-replied", title: "Creator replied", description: "@theolinds sent you a message.", hoursAgo: 8, read: false, relatedId: sTheo.id, now }),
    notification({ type: "creator-replied", title: "Creator replied", description: "@inescarvalho sent you a message.", hoursAgo: 21, read: true, relatedId: sInes.id, now }),
    notification({ type: "live-photo-fulfilled", title: "Live photo delivered", description: "@mayaokoye marked your photo request as delivered.", hoursAgo: 5, read: true, relatedId: sMaya.id, now }),
    notification({ type: "live-video-fulfilled", title: "Creator sent video", description: "@inescarvalho marked your video request as delivered.", hoursAgo: 21, read: false, relatedId: sInes.id, now }),
    notification({ type: "chat-expiring", title: "Conversation expires in 1 hour", description: "Your chat with @inescarvalho expires soon.", hoursAgo: 1, read: false, relatedId: `${sInes.id}:expiring`, now }),
    notification({ type: "chat-expired", title: "Chat expired", description: "Your 24-hour chat access with @pixel_priya has ended.", hoursAgo: 26, read: true, relatedId: `${sPixel.id}:expired`, now }),
    notification({ type: "chat-expired", title: "Chat expired", description: "Your 24-hour chat access with @beatsbyremy has ended.", hoursAgo: 116, read: true, relatedId: `${sBeats.id}:expired`, now }),
    notification({ type: "chat-renewed", title: "Conversation renewed", description: "Your chat with @mayaokoye was renewed for another 24 hours.", hoursAgo: 5, read: false, relatedId: sMaya.id, now }),
    notification({ type: "purchase-completed", title: "Purchase successful", description: "24-hour chat access with @mayaokoye is now active.", hoursAgo: 5, read: true, relatedId: sMaya.id, now }),
    notification({ type: "payment-issue-updated", title: "Payment issue updated", description: "Your incorrect-charge report for @theolinds was resolved.", hoursAgo: 6, read: true, relatedId: paymentIssues[0].id, now }),
    notification({ type: "report-updated", title: "Report updated", description: "Your report about @mayaokoye was resolved.", hoursAgo: 5, read: true, relatedId: reports[0].id, now }),
    notification({ type: "creator-replied", title: "Creator replied", description: "@styledby_elle sent you a message.", hoursAgo: 200, read: true, relatedId: sElle.id, now }),
  ];
  saveAllNotifications([...getAllNotifications(), ...notifications]);

  // -------------------------------------------------------------------
  // Fan preferences: favourite categories + a recent search
  // -------------------------------------------------------------------
  writeDiscoverFilters({ search: "lifestyle", category: "All" });

  writeStorage(SEEDED_FLAG_KEY, true);
}
