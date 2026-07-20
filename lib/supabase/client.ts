"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser-safe Supabase client for Client Components. Only ever uses the
 * public URL + anon key (never the service-role key). Throws a clear
 * SupabaseConfigError if called before Supabase is configured — callers
 * should check `isSupabaseConfigured()` first if Supabase is optional in
 * that code path (see lib/repositories/index.ts).
 */
export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const env = requireSupabasePublicEnv();
    browserClient = createBrowserClient<Database>(env.url, env.anonKey);
  }
  return browserClient;
}
