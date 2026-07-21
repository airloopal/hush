# Supabase setup

Hush's local demo mode (see `lib/demo-auth.ts`) works today with zero
configuration — none of this is required to run or demo the app. This
guide is for when a real backend is actually wired up, one repository at a
time (see `lib/repositories/index.ts`).

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create an account/organization if you don't have one.
2. Click **New project**, choose your organization, name it (e.g. `hush`), and set a database password. Save that password somewhere safe — it's not stored anywhere in this repo.
3. Wait for provisioning to finish (a minute or two).

## 2. Add environment variables

1. In the Supabase dashboard, go to **Settings > API**.
2. Copy `.env.example` to `.env.local` in the project root:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in the three values from that API settings page:
   - `NEXT_PUBLIC_SUPABASE_URL` — the **Project URL**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the **anon / public** key
   - `SUPABASE_SERVICE_ROLE_KEY` — the **service_role** key

`.env.local` is already covered by `.gitignore` (`*.local`) — never commit
real values.

### Keeping the service-role key server-only

The service-role key bypasses Row Level Security entirely. Treat it like a
root database password:

- It must **never** be prefixed with `NEXT_PUBLIC_` — that prefix is what
  tells Next.js to bundle a variable into client JavaScript.
- It's only ever read inside `lib/supabase/admin.ts`, which starts with
  `import "server-only"`. That import makes the Next.js build fail
  immediately if any Client Component ever imports that module, even
  transitively — don't remove it.
- Don't pass it through props, don't log it, don't put it in an API
  response body.

## 3. Link the Supabase CLI

The CLI is installed as a dev dependency, so use it via `npx`/`npm run`
rather than a global install.

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
```

Your project ref is the subdomain in your Project URL
(`https://<project-ref>.supabase.co`).

## 4. Running migrations

Schema lives in `supabase/migrations/` as plain SQL files. To create a new
one:

```bash
npx supabase migration new <descriptive_name>
```

Write your SQL, then apply it to your linked project:

```bash
npx supabase db push
```

Or, if you're running a local Supabase stack via Docker for development:

```bash
npx supabase start
npx supabase migration up
```

## 5. Generating TypeScript database types

After any schema change, regenerate `lib/supabase/database.types.ts` so
the typed clients in `lib/supabase/` stay in sync with the real schema:

```bash
npm run supabase:types
```

This runs `supabase gen types typescript --linked`, which requires having
completed step 3 (linking the project) first.

## 6. Wiring a repository to Supabase

Each domain (profiles, creators, conversations, messages, purchases,
notifications) has:

- an interface in `lib/repositories/<name>-repository.ts`
- a working demo implementation in `lib/repositories/demo/`
- a placeholder Supabase implementation in `lib/repositories/supabase/index.ts` that currently throws

To bring one online:

1. Add the schema/migration for that domain and run it (steps 3–4).
2. Regenerate types (step 5).
3. Implement the corresponding function(s) in `lib/repositories/supabase/index.ts` using `createSupabaseServerClient()` (or the browser/route-handler client, depending on where it's called from).
4. Flip that one line in `lib/repositories/index.ts` from the demo implementation to the Supabase one — everything that calls `getRepositories()` picks it up automatically, with no other code changes.

Do this one repository at a time; there's no need to migrate everything
at once, and the demo experience keeps working for anything not yet
migrated.

## 7. Applying migrations (Phase 2.1B: profiles, creators, categories)

`supabase/migrations/` now has real schema — profiles, categories,
creator_profiles, creator_categories, creator_favourites, their RLS
policies, and the public creator discovery view. Apply it the same way as
any migration (step 4):

```bash
npx supabase db push          # against your linked remote project
# or, for a local Docker-based stack:
npx supabase start
npx supabase migration up
```

Migrations are numbered and run in order — see
`docs/profiles-and-creators-schema.md` for what each one does.

### Category seeding

The category list (Lifestyle, Music, Fitness, Gaming, Fashion, Sport,
Business, Education, Art, 18+) is seeded by
`20260701000004_categories_table.sql` using `insert ... on conflict (slug)
do update`, so it's safe to re-run on every deploy — existing rows are
updated in place, never duplicated. To add or rename a category later,
prefer a new migration over an ad hoc `UPDATE` so the change is tracked.

## 8. Regenerating database types after this schema

```bash
npm run supabase:types
```

`lib/supabase/database.types.ts` was hand-derived from these migrations
(cross-checked against a real Postgres 16 database they were applied to)
since this environment has no network access to a linked Supabase
project. Run the real generator against your own project before trusting
it beyond local development — it should produce an equivalent shape.

## 9. Verifying Row Level Security

There's no automated test suite for this yet (see
`docs/profiles-and-creators-schema.md` → "Known future work"), but every
policy was manually verified by applying the migrations to a real local
Postgres 16 instance and exercising each role:

- Connect via `psql` (or the Supabase SQL editor) and simulate a specific
  user's session before testing:
  ```sql
  begin;
  set local request.jwt.claim.sub = '<user-uuid>';
  set local role authenticated;   -- or `anon` for a signed-out request
  -- your test query here
  reset role;
  commit;
  ```
- Confirm a fan can only see their own row in `profiles`, never another
  user's.
- Confirm a fan cannot change their own `role` or `status` (expect the
  `protect_profile_role_status` trigger to raise an exception).
- Confirm `anon` can read `public.public_creator_profiles` but gets
  "permission denied" on the raw `profiles`/`creator_profiles` tables.
- Confirm a draft creator profile never appears in
  `public.public_creator_profiles` until its status is `approved`.

## 10. Promoting a test user to creator

As the user themselves (authenticated), insert their own row — this is
allowed by RLS, and the `protect_creator_profile_admin_fields` trigger
forces `status` to `draft` and every aggregate/financial field to its
default regardless of what's sent:

```sql
insert into public.creator_profiles (user_id, chat_price_minor, photo_price_minor, video_price_minor)
values ('<their-auth-uid>', 1500, 800, 2500);
```

Their profile `role` also needs to move from `fan` to `creator` for the
rest of the product to treat them as one — that column-change requires an
admin (see the next section) or, during initial bootstrap, a direct SQL
connection (see below).

## 11. How an admin approves a creator

Only an admin can move a creator out of `draft`/`pending_review`. As an
authenticated admin (`public.is_admin()` returns true for their session):

```sql
update public.creator_profiles
set status = 'approved',
    approved_at = now(),
    approved_by = '<admin-auth-uid>'
where user_id = '<creator-auth-uid>';
```

The `creator_profiles_no_self_approval` constraint rejects
`approved_by = user_id` even for an admin approving their own creator
row — have a different admin approve it, or approve from a service-role
context on their behalf.

### Bootstrapping the very first admin

Nobody can pass `is_admin()` before an admin exists. Direct SQL access as
the `postgres` role (the Supabase SQL editor, or `psql` connected with the
database password) or the `service_role` key is exempted from the
role/status protection trigger specifically so you can run this once:

```sql
update public.profiles set role = 'admin' where id = '<their-auth-uid>';
```

Do this only through a trusted, server-side/administrative connection —
never expose a path that lets an ordinary authenticated request set its
own role.

## 12. Auth configuration (Phase 2.2A)

Real Supabase authentication (`lib/auth/`) activates automatically once
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see § 2)
— nothing else to flip. These settings need to be configured on the
Supabase project itself before signup/login/password-reset actually work.

### Site URL and Redirect URLs

In the Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: your production URL (e.g. `https://your-app.vercel.app`).
- **Redirect URLs** (allow-list — Supabase rejects any `emailRedirectTo`/
  `redirectTo` not on this list, which is what actually prevents open
  redirects at the provider level):
  - `http://localhost:3000/auth/callback` (local dev)
  - `https://your-app.vercel.app/auth/callback` (production)
  - `https://*-your-team.vercel.app/auth/callback` (Vercel preview
    deployments, if you want email links to work from PR previews too —
    optional)

### Email verification configuration

**Authentication → Email Templates → Confirm signup**: the default
template works as-is; it links to `{{ .ConfirmationURL }}`, which
`lib/auth/auth-service.ts`'s `signUp()` call points at
`${origin}/auth/callback` via `emailRedirectTo`. Confirm **Authentication
→ Providers → Email → "Confirm email"** is switched **on** (it's on by
default) — this is what makes `app/auth/callback/route.ts`'s expired/
invalid-link handling actually reachable, and gates login until the
address is verified.

### Password reset redirect configuration

**Authentication → Email Templates → Reset password** likewise links to
`{{ .ConfirmationURL }}`. `requestPasswordReset()` in
`lib/auth/auth-service.ts` sets `redirectTo` to
`${origin}/auth/callback?next=/reset-password` — the callback route
recognizes `next=/reset-password` and forwards there regardless of
onboarding/profile state (see `docs/authentication-flow.md`).

### Local development callback URL

`http://localhost:3000/auth/callback` — add this to the Redirect URLs
allow-list above, or email links generated while developing locally will
be rejected by Supabase.

### Production (Vercel) callback URL

`https://<your-domain>/auth/callback` — set this as both the Site URL and
in the Redirect URLs allow-list once you have a real domain. Update it
again if the domain changes.

### Demo mode behavior

With no Supabase environment configured, every page under `lib/auth/`
degrades to the existing local demo system (`lib/demo-auth.ts`) — see
`docs/authentication-flow.md` § "Demo mode fallback" for exactly what
that means per page. `isDemoMode()` (`lib/auth/mode.ts`) is the single
source of truth other code should check; nothing should call
`isSupabaseConfigured()` directly outside `lib/auth/` and
`lib/supabase/env.ts`.

### Creator role promotion, safely

Selecting "Creator" at signup **never** grants the `creator` role by
itself — `handle_new_user()` always inserts `role = fan`, and
`account_type_requested` (passed as signup metadata purely so the client
can route to creator onboarding) is never read by any database trigger.
After creator onboarding, the browser inserts its own `creator_profiles`
row (forced to `status = 'draft'` by
`protect_creator_profile_admin_fields`) and self-submits it to
`pending_review` — the one self-service transition
`20260701000014_allow_creator_submit_for_review.sql` explicitly allows.
`profiles.role` itself only ever becomes `creator` through an admin
action (see § 9–11) — this sprint doesn't yet add that promotion step to
any UI; it remains a direct SQL/admin-tooling action, matching the
"do not implement admin UI" boundary for this phase.
