import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAdminEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

/**
 * Service-role Supabase client for privileged, server-only operations
 * (e.g. admin tooling, trusted background jobs) that must bypass Row Level
 * Security. This bypasses RLS entirely — never call it on behalf of a
 * specific user's request without your own authorization check first.
 *
 * The `server-only` import above is not decorative: if any Client
 * Component ever imports this module (even transitively), the Next.js
 * build fails immediately rather than silently bundling the service-role
 * key into client JavaScript.
 */
export function createSupabaseAdminClient() {
  if (!adminClient) {
    const env = requireSupabaseAdminEnv();
    adminClient = createClient<Database>(env.url, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
