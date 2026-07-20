import type { DemoUser } from "@/lib/demo-auth-types";

// Fixed, not Date.now()-based, so seeded records are stable across reloads.
const SEED_CREATED_AT = "2026-01-01T00:00:00.000Z";

export const DEMO_FAN: DemoUser = {
  id: "demo-fan-alexm",
  username: "alexm",
  email: "fan@hush.demo",
  displayName: "Alex Morgan",
  role: "fan",
  isDemo: true,
  createdAt: SEED_CREATED_AT,
};

export const DEMO_CREATOR: DemoUser = {
  id: "demo-creator-mayaokoye",
  username: "mayaokoye",
  email: "creator@hush.demo",
  displayName: "Maya Okoye",
  role: "creator",
  category: "Lifestyle",
  isDemo: true,
  createdAt: SEED_CREATED_AT,
};

// Demo-only credentials, intentionally in plain sight — this is a
// prototype, not a security boundary. Never do this in production.
const DEMO_CREDENTIALS: { email: string; password: string; user: DemoUser }[] = [
  { email: DEMO_FAN.email, password: "HushFan24!", user: DEMO_FAN },
  { email: DEMO_CREATOR.email, password: "HushCreator24!", user: DEMO_CREATOR },
];

export function findDemoUserByCredentials(email: string, password: string): DemoUser | null {
  const normalizedEmail = email.trim().toLowerCase();
  const match = DEMO_CREDENTIALS.find(
    (credential) => credential.email.toLowerCase() === normalizedEmail && credential.password === password
  );
  return match ? match.user : null;
}

export function getOtherDemoUser(current: DemoUser): DemoUser {
  return current.role === "fan" ? DEMO_CREATOR : DEMO_FAN;
}
