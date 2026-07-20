/**
 * Central environment validation for Supabase.
 *
 * This is the ONLY place in the app that reads Supabase-related
 * environment variables. Nothing else should call `process.env.NEXT_PUBLIC_SUPABASE_*`
 * or `process.env.SUPABASE_*` directly — always go through the helpers
 * below so there's a single, auditable source of truth for "is Supabase
 * configured" and a single place that decides what happens when it isn't.
 *
 * Phase 2.1A is foundation-only: nothing in the app actually calls into
 * Supabase yet (see lib/repositories/index.ts), so a missing/unconfigured
 * Supabase environment is expected and must not break the local demo. The
 * "clear configuration error" behavior below only fires when something
 * actually tries to construct a Supabase client without the required
 * variables present — it never fires just because the app booted.
 */

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

export interface SupabaseAdminEnv extends SupabasePublicEnv {
  serviceRoleKey: string;
}

function readPublicEnv(): Partial<SupabasePublicEnv> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

/** True once both public Supabase variables are present. Safe to call from
 * both client and server code — never touches the service-role key. */
export function isSupabaseConfigured(): boolean {
  const env = readPublicEnv();
  return Boolean(env.url && env.anonKey);
}

/**
 * Returns the validated public (browser-safe) Supabase config, or throws a
 * clear, actionable error if it's missing. Call this only from code paths
 * that are actually about to create a Supabase client — do not call it
 * eagerly at module load / app boot, since the demo must keep working with
 * no Supabase configuration at all.
 */
export function requireSupabasePublicEnv(): SupabasePublicEnv {
  const env = readPublicEnv();
  if (!env.url || !env.anonKey) {
    throw new SupabaseConfigError([
      !env.url && "NEXT_PUBLIC_SUPABASE_URL",
      !env.anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  }
  return { url: env.url, anonKey: env.anonKey };
}

/**
 * Server-only: also validates SUPABASE_SERVICE_ROLE_KEY. This must never be
 * called from a Client Component — see lib/supabase/admin.ts, which is the
 * only file that should call this, and which is itself guarded with the
 * `server-only` package so any accidental client import fails the build.
 */
export function requireSupabaseAdminEnv(): SupabaseAdminEnv {
  const publicEnv = requireSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new SupabaseConfigError(["SUPABASE_SERVICE_ROLE_KEY"]);
  }
  return { ...publicEnv, serviceRoleKey };
}

export class SupabaseConfigError extends Error {
  constructor(missing: Array<string | false | undefined>) {
    const names = missing.filter((v): v is string => Boolean(v));
    super(
      `Supabase is not configured. Missing environment variable${names.length === 1 ? "" : "s"}: ${names.join(
        ", "
      )}. Copy .env.example to .env.local and fill in your Supabase project's values — see docs/supabase-setup.md.`
    );
    this.name = "SupabaseConfigError";
  }
}
