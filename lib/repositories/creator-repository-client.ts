"use client";

import { isDemoMode } from "@/lib/auth/mode";
import { demoCreatorRepository } from "@/lib/repositories/demo/demo-creator-repository";
import { supabaseCreatorRepositoryBrowser } from "@/lib/repositories/supabase/creator-repository-browser";
import type { CreatorRepository } from "@/lib/repositories/creator-repository";

/**
 * The only creator-repository import Client Components should use.
 * Centralizes the demo-vs-Supabase decision in one place (per the
 * project's established rule of never scattering `isDemoMode()` checks
 * across pages) while staying importable from the browser — unlike
 * `getRepositories()` (lib/repositories/index.ts), which is written for
 * server-side callers and would pull in `server-only` code if imported
 * here.
 */
export function getClientCreatorRepository(): CreatorRepository {
  return isDemoMode() ? demoCreatorRepository : supabaseCreatorRepositoryBrowser;
}
