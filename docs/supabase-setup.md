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
