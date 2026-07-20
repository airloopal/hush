import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Supabase client for use inside Server Components (async — `cookies()` is
 * async in Next.js 15). Server Components can read cookies but can't
 * always write them, so cookie writes are best-effort here; a real
 * integration should also refresh the session in middleware. Never import
 * this from a Client Component — it's guarded by `server-only`.
 */
export async function createSupabaseServerClient() {
  const env = requireSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Setting cookies from a Server Component (outside a Server
          // Action or Route Handler) is a no-op in Next.js. This is safe
          // to ignore as long as session refresh also happens in
          // middleware — see docs/supabase-setup.md.
        }
      },
    },
  });
}
