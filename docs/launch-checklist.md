# Production launch checklist (Supabase go-live)

Concise version of `docs/supabase-setup.md` — follow in order. Each numbered
step tells you if it happens in your terminal or in the Supabase dashboard.

- [ ] **1. Create the Supabase project** — dashboard: New Project, choose a
      region close to your users, set a strong database password (save it
      somewhere safe — you'll need it for `supabase link`).
- [ ] **2. Set environment variables** — copy `.env.example` to `.env.local`
      (local) and to your Vercel project's Environment Variables (dashboard →
      Project Settings → Environment Variables):
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dashboard →
      Project Settings → API), `SUPABASE_SERVICE_ROLE_KEY` (same page —
      **server-only**, never add the `NEXT_PUBLIC_` prefix to it, never commit
      it).
- [ ] **3. Site URL** — dashboard → Authentication → URL Configuration → Site
      URL = your production domain (e.g. `https://hush.example.com`).
- [ ] **4. Redirect URLs** — same page → Redirect URLs, add:
      `http://localhost:3000/auth/callback` (local dev) and
      `https://<your-vercel-domain>/auth/callback` (production) — add every
      Vercel preview-deployment domain pattern you use, or preview signups
      won't be able to verify.
- [ ] **5. Email verification** — dashboard → Authentication → Providers →
      Email: confirm "Confirm email" is on. Optionally customize the
      confirmation email template (Authentication → Email Templates) — the
      default works, but should link to `{{ .SiteURL }}/auth/callback`.
- [ ] **6. Password recovery** — same Email Templates page, confirm the
      "Reset Password" template also points at `{{ .SiteURL }}/auth/callback`
      (the app appends `?next=/reset-password` itself — see
      `lib/auth/auth-service.ts`).
- [ ] **7. Link the CLI** — terminal: `npx supabase login`, then
      `npx supabase link --project-ref <your-project-ref>` (find the ref in
      the dashboard URL or Project Settings → General).
- [ ] **8. Apply migrations** — terminal: `npx supabase db push`. All 14
      migrations in `supabase/migrations/` were validated against a real
      local Postgres 16 instance and apply cleanly in order (see this
      sprint's delivery notes) — this step replays them against your real
      project.
- [ ] **9. Generate database types** — terminal: `npm run supabase:types`.
      Commit the resulting `lib/supabase/database.types.ts`.
- [ ] **10. Create the first admin securely** — dashboard → SQL Editor
      (connects as a trusted role, which is what makes this step work — see
      `docs/supabase-setup.md` § "Bootstrapping the very first admin"):
      ```sql
      update public.profiles set role = 'admin' where id = '<their-auth-uid>';
      ```
      Find `<their-auth-uid>` under Authentication → Users after they've
      signed up normally through the app.
- [ ] **11. Smoke test in production** — sign up a real fan account, confirm
      the verification email arrives and the link logs you in and redirects
      to onboarding; sign up a creator account and confirm the same, then
      submit for review and approve it as the admin from step 10; confirm
      `/dev/diagnostics` shows the expected role/status for that admin
      account (see `app/dev/diagnostics/page.tsx` — dev-only or admin-only,
      shows no secrets).
- [ ] **12. Remove or keep the diagnostics page** — it's safe to leave (404s
      for everyone except admins once out of development), but consider
      deleting `app/dev/diagnostics/` once you're confident in the setup.

If any step fails, `docs/supabase-setup.md` and `docs/authentication-flow.md`
have the fuller explanation of what that piece does and why.
