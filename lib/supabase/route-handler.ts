import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase client for use inside Route Handlers (`app/**\/route.ts`).
 * Unlike Server Components, Route Handlers can always write cookies, so
 * there's no try/catch needed around setAll. There are no route handlers
 * in this app yet — this exists as the typed foundation for when one is
 * added. Never import this from a Client Component — it's guarded by
 * `server-only`.
 */
export async function createSupabaseRouteHandlerClient() {
  const env = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
