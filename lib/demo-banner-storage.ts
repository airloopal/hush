import { readStorage, writeStorage } from "@/lib/storage";

const DEMO_BANNER_DISMISSED_KEY = "hush:demo-banner-dismissed";

export function isDemoBannerDismissed(): boolean {
  return readStorage<boolean>(DEMO_BANNER_DISMISSED_KEY) === true;
}

export function dismissDemoBanner(): void {
  writeStorage(DEMO_BANNER_DISMISSED_KEY, true);
}
