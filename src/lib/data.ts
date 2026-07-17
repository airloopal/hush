export type CreatorCategory = "Adult" | "Gaming" | "Music" | "Fitness" | "Lifestyle" | "Expert";

export type Creator = {
  username: string;
  displayName: string;
  category: CreatorCategory;
  lastSeenMinutes: number;
  responseMinutes: number;
  chatPrice: number;
  photoPrice: number;
  videoPrice: number;
  bio: string;
  image: string;
  verified?: boolean;
  boosted?: boolean;
  ageRestricted?: boolean;
};

export const categories: Array<"All" | CreatorCategory> = [
  "All",
  "Gaming",
  "Music",
  "Fitness",
  "Lifestyle",
  "Expert",
  "Adult"
];

export const creators: Creator[] = [
  {
    username: "pixelmara",
    displayName: "PixelMara",
    category: "Gaming",
    lastSeenMinutes: 1,
    responseMinutes: 5,
    chatPrice: 5,
    photoPrice: 8,
    videoPrice: 16,
    bio: "Co-op strategy, gaming chat and live reactions without the noisy public feed.",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
    verified: true,
    boosted: true
  },
  {
    username: "lunarose",
    displayName: "LunaRose",
    category: "Adult",
    lastSeenMinutes: 2,
    responseMinutes: 6,
    chatPrice: 5,
    photoPrice: 10,
    videoPrice: 20,
    bio: "Private, respectful conversations with live, in-the-moment media for adults only.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
    verified: true,
    ageRestricted: true
  },
  {
    username: "coachdaniel",
    displayName: "CoachDaniel",
    category: "Fitness",
    lastSeenMinutes: 4,
    responseMinutes: 10,
    chatPrice: 7,
    photoPrice: 10,
    videoPrice: 18,
    bio: "Straightforward training advice, form checks and practical accountability.",
    image: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=900&q=80",
    verified: true
  },
  {
    username: "nina.wav",
    displayName: "Nina.wav",
    category: "Music",
    lastSeenMinutes: 7,
    responseMinutes: 15,
    chatPrice: 6,
    photoPrice: 9,
    videoPrice: 19,
    bio: "Songwriting, studio life and honest feedback for independent artists.",
    image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80"
  },
  {
    username: "devwithsam",
    displayName: "DevWithSam",
    category: "Expert",
    lastSeenMinutes: 11,
    responseMinutes: 20,
    chatPrice: 12,
    photoPrice: 15,
    videoPrice: 30,
    bio: "Product, code and startup questions answered clearly in private.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    verified: true
  },
  {
    username: "mialove",
    displayName: "MiaLove",
    category: "Lifestyle",
    lastSeenMinutes: 17,
    responseMinutes: 24,
    chatPrice: 6,
    photoPrice: 12,
    videoPrice: 22,
    bio: "Travel, fashion and relaxed one-to-one conversation without subscriptions.",
    image: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=80"
  }
];
