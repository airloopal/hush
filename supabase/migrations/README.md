# Database migrations

This folder holds Supabase (Postgres) SQL migrations, managed by the
Supabase CLI.

No schema exists yet — Phase 2.1A only sets up the project foundation
(typed clients, repository/service scaffolding). The placeholder migration
in this folder creates nothing; it's here so the migration history starts
at a known point and so `supabase db push` / `supabase migration up` have
something to run against a fresh project.

## Adding a real migration

```bash
supabase migration new <descriptive_name>
```

This creates a new timestamped `.sql` file in this folder. Write your
schema changes there, then apply them with:

```bash
supabase db push          # against your linked remote project
# or
supabase migration up     # against a local Supabase instance
```

After any schema change, regenerate the TypeScript types:

```bash
npm run supabase:types
```

See ../../docs/supabase-setup.md for the full setup flow.
