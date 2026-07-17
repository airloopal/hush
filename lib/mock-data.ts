/**
 * Mock data for the design-system showcase page only.
 * No network calls, no persistence — swap for real data fetching in
 * consuming pages/routes.
 *
 * Hush is a paid-conversation platform: creators sell time-boxed chat
 * access (text, live photo, live video) across a broad range of
 * categories — gaming, music, fitness, lifestyle, expert advice, and a
 * clearly labeled, non-dominant lawful-adult (18+) category.
 */

export const mockCreators = [
  {
    name: "Theo Lindqvist",
    handle: "theolinds",
    bio: "Co-op strategy sessions and build reviews for competitive gamers.",
    categories: ["Gaming", "Tech"],
    followers: "92K",
    engagementRate: "4.1%",
    online: true,
    featured: false,
    avatarUrl: "",
  },
  {
    name: "Ines Carvalho",
    handle: "inescarvalho",
    bio: "Vocal coaching and songwriting feedback, one chat at a time.",
    categories: ["Music", "Expert Advice"],
    followers: "58K",
    engagementRate: "5.9%",
    online: false,
    featured: true,
    avatarUrl: "",
  },
  {
    name: "Priya Nandan",
    handle: "priyanandan",
    bio: "Strength training programs and honest supplement Q&A.",
    categories: ["Fitness", "Wellness"],
    followers: "301K",
    engagementRate: "5.4%",
    online: true,
    featured: false,
    avatarUrl: "",
  },
  {
    name: "Maya Okoye",
    handle: "mayaokoye",
    bio: "Slow-living and home-organizing chats for a calmer week.",
    categories: ["Lifestyle"],
    followers: "184K",
    engagementRate: "6.8%",
    online: true,
    featured: false,
    avatarUrl: "",
  },
  {
    name: "Daniel Ferris",
    handle: "danielferris_cpa",
    bio: "Licensed CPA answering small-business tax questions live.",
    categories: ["Expert Advice"],
    followers: "41K",
    engagementRate: "3.2%",
    online: false,
    featured: false,
    avatarUrl: "",
  },
  {
    name: "Ruby Sinclair",
    handle: "rubysinclair",
    bio: "Lawful adult creator. Age-verified, 18+ chat access only.",
    categories: ["18+"],
    followers: "126K",
    engagementRate: "7.2%",
    online: true,
    featured: false,
    avatarUrl: "",
  },
];

export const mockDashboardMetrics = [
  { label: "Active chats", value: "12", delta: 9, accent: "neutral" as const },
  { label: "Chats expiring soon", value: "3", delta: -4, accent: "amber" as const },
  { label: "Est. earnings (mo.)", value: "$5,140", delta: 22, accent: "neutral" as const },
  { label: "Sponsored boost views", value: "1.2K", delta: 34, accent: "violet" as const },
];

// A 24-hour paid chat access window, used by the Hush core example.
export const mockChatAccess = {
  creatorName: "Ines Carvalho",
  startedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // expiring soon
  accessPrice: "$19",
  livePhotoPrice: "$8",
  liveVideoPrice: "$25",
  lastSeenAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
};

export const mockDeadline = mockChatAccess.expiresAt;

export const mockCategories = [
  "Gaming",
  "Music",
  "Fitness",
  "Lifestyle",
  "Expert Advice",
  "Comedy",
  "Art",
  "18+",
];

export const mockStatuses = ["draft", "pending", "live", "completed", "expired"] as const;
