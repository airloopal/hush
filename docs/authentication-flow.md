# Authentication flow (Phase 2.2A)

Everything below describes **Supabase mode** (`isDemoMode()` returns
`false` — see `lib/auth/mode.ts`). Demo mode is covered separately at the
bottom, since it intentionally bypasses almost all of this.

## Signup lifecycle

1. `/signup` collects display name, username, email, password + confirm,
   account type (fan/creator), date of birth, adult-content preference,
   and Terms acceptance — validated client-side by `lib/auth/validation.ts`
   (email format, password strength, matching passwords, username
   format/reserved-word check, 18+ date-of-birth check) before anything is
   sent to Supabase.
2. `signUp()` (`lib/auth/auth-service.ts`) calls
   `supabase.auth.signUp()` with `emailRedirectTo` pointed at
   `/auth/callback`, and a metadata payload containing **only**
   `display_name`, `username`, `account_type_requested`, `date_of_birth`,
   `adult_content_enabled`. No role, status, or approval field is ever
   included — client-supplied metadata has zero authority over those
   columns (see "Role escalation" in the security notes below).
3. Supabase's `on_auth_user_created` trigger fires `handle_new_user()`
   (see `supabase/migrations/20260701000010_handle_new_user.sql`), which
   inserts the `profiles` row: `role` is hardcoded to `fan`, `username` is
   taken from metadata only if it's valid and not already taken (silently
   dropped otherwise — the user picks one later in onboarding, same UX as
   an invalid/missing value).
4. The UI shows a "check your email" confirmation — the account is not
   usable yet (`supabase.auth.signUp` doesn't return a usable session
   until the email is confirmed, since "Confirm email" is on).

## Email verification flow

1. The user clicks the emailed link, landing on `/auth/callback?code=...`.
2. `app/auth/callback/route.ts` exchanges the code for a session
   (`exchangeCodeForSession`). An invalid, expired, or already-used code
   redirects to `/login?error=expired-link` rather than throwing.
3. If `next=/reset-password` is present (a password-recovery link, not a
   signup confirmation), the route redirects there immediately — a
   password reset is not "using the app," so onboarding/status checks are
   skipped for that path.
4. Otherwise, the route looks up the `profiles` row via
   `supabaseProfileRepository.getById()`. Missing profile → fail safely
   (`/login?error=missing-profile`, never a guess). Non-`active` status →
   `/login?error=account-blocked`.
5. `onboarding_completed = false` → `/onboarding/account-type`.
   `onboarding_completed = true` → `/discover` (fan) or `/dashboard`
   (creator), or the original intended destination if a safe `next` was
   provided.

## Login flow

`/login` renders the real Supabase form when `!isDemoMode()`: email,
password, show/hide toggle, "stay signed in," Forgot password, Create an
account. `signIn()` calls `supabase.auth.signInWithPassword()`; any error
is mapped through `classifySupabaseAuthError()` → `authErrorMessage()`
(`lib/auth/errors.ts`) so the UI only ever shows a small set of
predictable, non-leaking messages (invalid credentials, not verified,
rate-limited, network failure, etc.) — never a raw provider error string.
A successful login redirects to the safe `next` param if present,
otherwise `/discover`, and calls `router.refresh()` so server components
re-evaluate the new auth state immediately.

## Password recovery flow

1. `/forgot-password` collects an email and calls
   `requestPasswordReset()`, which always shows the same neutral
   confirmation regardless of whether the account exists — this is
   deliberate (see "Email enumeration" below), not a bug.
2. The emailed link routes through `/auth/callback?next=/reset-password`
   (see above), landing the user on `/reset-password` with an active
   recovery session already established by the code exchange.
3. `/reset-password` checks for that session on mount
   (`supabase.auth.getSession()`); no session → "this link is invalid or
   expired" with a link back to request a new one. With a session, the
   form enforces the same password-strength/match rules as signup, calls
   `updatePassword()` (`supabase.auth.updateUser({ password })`), and
   redirects to `/login` on success.

## Protected-route behavior

`middleware.ts` runs on every request except static assets. In Supabase
mode, it calls `supabase.auth.getUser()` (not `getSession()` — `getUser()`
revalidates against the Auth server rather than trusting a possibly-stale
cookie) to refresh the session and determine identity. Unauthenticated
requests to anything not in the public allow-list (`/`, `/login`,
`/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`,
`/safety`, `/design-system`) redirect to `/login?next=<original path>` —
`next` is validated to be a same-origin relative path (`safeNextPath()`),
never an absolute/external URL, before being trusted anywhere.

In **demo mode**, `middleware.ts` is a complete no-op — route protection
continues exactly as it always has, client-side, via
`useRequireAccount`/`useRequireRole` (`lib/use-account-guard.ts`).

## Onboarding redirects

Reuses the existing onboarding UI (`app/onboarding/**`) entirely
unchanged in structure. Only the final "finish" step on each branch
(`/onboarding/fan`, `/onboarding/creator/preview`) is mode-aware: in
Supabase mode it calls `lib/auth/onboarding-sync.ts`, which writes the
real `profiles`/`creator_profiles` rows (setting
`onboarding_completed = true`) and also mirrors the result into the local
`hush:account` bridge, since the rest of the app (Discover, Dashboard,
Chats, etc.) still reads that bridge rather than Supabase directly — see
the file's own header comment for why that's intentional for this phase.
A creator's `profiles.role` is never changed by this step; only their
`creator_profiles.status` moves from `draft` to `pending_review` (the one
self-service transition the database allows).

## Account status handling

`getCurrentUserResult()` (`lib/auth/current-user.ts`) is the single place
that checks `profiles.status`. `suspended`/`banned`/`deleted` all resolve
to a `"blocked"` result with a reason, distinct from `"missing-profile"`
and `"ok"` — callers show a clear, specific status message rather than a
generic error, and blocked accounts never reach the normal application
shell.

## Demo mode fallback

With `isDemoMode()` true (no Supabase env configured): `/login` shows the
existing "Explore the Demo" cards and quick-login buttons instead of the
real form; `/signup`, `/forgot-password`, and `/reset-password` render a
clear "this needs Supabase configured" message rather than a broken form;
`middleware.ts` no-ops entirely; `AccountMenu`'s "Switch Account" (a
demo-only concept) only renders in demo mode. A small violet
`DemoModeBadge` (`components/demo-mode-badge.tsx`) appears on the login
page whenever demo mode is active, so it's never ambiguous which mode is
running.

## Security notes

- **Open redirects**: every `next`/redirect destination (middleware,
  `/login`, `/auth/callback`) is validated to be a same-origin relative
  path before use — never trusted as-is.
- **Role escalation via signup metadata**: `handle_new_user()` never reads
  a role from client metadata; `account_type_requested` has no database
  authority, only client-side routing significance.
- **Client-side trust of account type**: the actual `creator` role is
  never assigned client-side — only an admin action changes it (§
  supabase-setup.md § 9–11).
- **Service-role exposure**: never used anywhere in `lib/auth/` or any
  page — only `lib/supabase/admin.ts` (guarded by the `server-only`
  package) can construct that client.
- **Session fixation**: sessions come entirely from `@supabase/ssr`'s
  cookie handling; nothing in this codebase manually sets a session
  cookie or token.
- **Insecure password reset**: the reset page requires an active recovery
  session (established only via a valid, single-use emailed code) before
  accepting a new password — there's no path that accepts a new password
  from an unauthenticated request.
- **Email enumeration**: `/forgot-password` always shows the same
  message, whether or not the address has an account.
- **Stale demo sessions overriding production sessions**:
  `signOutEverywhere()` (`lib/auth/auth-service.ts`) always clears
  `hush:demo-session` in addition to the Supabase session, regardless of
  which mode is currently active, so a stale local demo session can never
  linger after switching a deployment into Supabase mode.
- **Route protection gaps**: `middleware.ts` matches every route except
  static assets (`config.matcher`) and denies by default — a route is
  public only if it's explicitly listed in `PUBLIC_ROUTES` or matches the
  Next.js internals prefix check, not the other way around. Covered by
  `__tests__/middleware.test.ts`, including a check that a public-looking
  but non-matching path (e.g. `/settings-secret`) is still protected.
- **Auth state mismatch between server and client**: logout awaits
  `signOutEverywhere()` before navigating, then calls `router.refresh()`
  to force Server Components to re-evaluate auth state on the destination
  page — without this, cached authenticated UI could flash briefly after
  logout. Middleware also re-validates the session on every request via
  `supabase.auth.getUser()`, so a client that still believes it's signed
  in cannot reach a protected page once the server-side session is gone.

## Known future work

- Discover/Dashboard/Chats/Settings still read the local `hush:account`
  bridge rather than Supabase directly (explicitly out of scope for this
  phase — "do not connect conversations to Supabase"). A later phase
  should replace the bridge reads with the real repositories.
- No admin UI exists yet for approving creators or changing roles/status
  — those remain direct SQL actions (documented in
  `docs/supabase-setup.md`).
- No automated integration test against a real Supabase project (no live
  project is available in this environment) — see the unit tests under
  `lib/auth/__tests__/` for what is covered without one, and
  `docs/supabase-setup.md` § 9 for the manual RLS verification procedure.
- Avatar/banner uploads are still local/placeholder — Supabase Storage is
  out of scope for this phase.
