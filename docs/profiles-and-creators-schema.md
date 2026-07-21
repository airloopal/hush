# Profiles & Creators schema (Phase 2.1B)

This documents the database foundation added in
`supabase/migrations/20260701000001_*` through `..._000013_grants.sql`.
None of it is wired to the app yet — see `lib/repositories/index.ts`,
which still always returns the local demo repositories. This is the
schema a future migration will connect to.

## Table relationships

```
auth.users (Supabase-managed)
  └─ public.profiles            (1:1, same primary key: id = auth.users.id)
       └─ public.creator_profiles   (1:1, user_id references profiles.id)
            ├─ public.creator_categories  (M:N, creator_id → creator_profiles, category_id → categories)
            └─ public.creator_favourites  (M:N, creator_id → creator_profiles, fan_id → profiles)

public.categories
  ├─ referenced by creator_profiles.primary_category_id (one, optional)
  └─ referenced by creator_categories.category_id (many)
```

Every table cascades on delete from its parent (`on delete cascade`), so
deleting an `auth.users` row cleans up its profile, creator profile,
category associations, and favourites automatically.

## Role model

`profiles.role` (`user_role` enum): `fan` (default for every new signup),
`creator`, `moderator`, `admin`, `super_admin`. `public.is_admin()` treats
`moderator`, `admin`, and `super_admin` identically for authorization
purposes — there's currently no behavioral difference between the three in
the database layer; that distinction is left for future, more granular
admin tooling.

`role` can never be set by the user themselves — `handle_new_user()` always
inserts `fan` regardless of signup metadata, and the
`protect_profile_role_status` trigger rejects any change to `role` (or
`status`) from a session that isn't an admin, with one exception: a direct
`postgres`/`service_role` connection (used to bootstrap the very first
admin — see `docs/supabase-setup.md` § 11).

## Creator approval lifecycle

```
 (fan inserts their own row)
        │
        ▼
     draft ───────────────┐
        │                 │
        │ (creator or     │ (admin)
        │  admin submits) │
        ▼                 ▼
 pending_review        rejected
        │
        │ (admin approves)
        ▼
    approved ───────────────► suspended
                (admin)           │
                                  │ (admin)
                                  ▼
                              approved (reinstated) or rejected
```

- A creator can only ever insert their **own** row, and only into `draft`
  — `protect_creator_profile_admin_fields` forces this regardless of what
  status the insert requests.
- Only an admin can move a row to `pending_review`, `approved`,
  `rejected`, or `suspended`; the same trigger silently pins `status` (and
  every approval/aggregate field) back to its previous value for anyone
  else's `UPDATE`.
- `creator_profiles_no_self_approval` (a CHECK constraint) additionally
  rejects `approved_by = user_id` outright — even an admin cannot approve
  their own creator row, full stop.

## Public creator exposure

Only rows where `creator_profiles.status = 'approved'` **and** the
owning `profiles.status = 'active'` are ever publicly visible — enforced
in three independent layers, deliberately redundant:

1. **RLS** on `creator_profiles` (`creator_profiles_select_public_approved`)
   makes only approved rows visible to `anon`/`authenticated` at all.
2. **Column-level GRANTs** additionally withhold `total_earnings_minor`,
   `profile_views_count`, `approved_at`, and `approved_by` from
   `anon`/`authenticated` even for a visible row, in case something queries
   the base table directly.
3. **`public.public_creator_profiles`**, a view (owned by a privileged
   role, so it reads through RLS as its owner rather than the caller) that
   joins `creator_profiles` + `profiles` + `categories` and projects only
   the safe columns: `user_id`, `username`, `display_name`, `avatar_url`,
   `bio`, `headline`, `banner_url`, pricing, `currency_code`,
   `availability`, `response_rate`, `average_response_minutes`,
   `completed_conversations_count`, `returning_fans_count`,
   `joined_creator_at`, and the primary category's id/slug/name. A sibling
   view, `public.public_creator_categories`, exposes the full (non-primary)
   category list under the same approved+active+category-active filter.

`date_of_birth`, `country_code`, `timezone`, `status`, `approved_by`,
`profile_views_count`, `total_earnings_minor`, and the user's email
(`auth.users`, never joined into any public view) are never exposed by
either view.

## Editable vs. protected fields

| Table | A user can edit (their own row) | Protected — admin/system only |
|---|---|---|
| `profiles` | `username`, `display_name`, `avatar_url`, `bio`, `country_code`, `timezone`, `adult_content_enabled`, `onboarding_completed` | `role`, `status`, `id` |
| `creator_profiles` | `headline`, `about`, `banner_url`, `primary_category_id`, `chat_price_minor`, `photo_price_minor`, `video_price_minor`, `currency_code`, `availability` | `status`, `approved_at`, `approved_by`, `response_rate`, `average_response_minutes`, `completed_conversations_count`, `returning_fans_count`, `profile_views_count`, `total_earnings_minor` |
| `creator_categories` | any row, but only while the creator's `status` is `draft`/`pending_review` | nothing once `approved`/`suspended` — an admin manages associations from then on |
| `creator_favourites` | their own favourites (insert/delete) | n/a — no update, no admin visibility by design |
| `categories` | nothing | everything — admin-only |

## Known future work

- **Conversations, messages, purchases, notifications** are explicitly out
  of scope for this phase — they'll get their own migrations and
  repositories later, following the same interface/demo/Supabase-stub
  pattern already in place for profiles and creators.
- **No automated RLS test suite yet.** Every policy in this phase was
  manually verified against a real local Postgres 16 instance (see
  `docs/supabase-setup.md` § 9); a pgTAP or similar suite would be a good
  follow-up so this becomes a repeatable CI check instead of a manual one.
- **`moderator`/`admin`/`super_admin` are behaviorally identical** in
  `is_admin()` today. Splitting them (e.g. moderators can suspend but not
  approve) is a plausible follow-up once real moderation tooling exists.
- **No storage/avatar upload path yet** — `avatar_url`/`banner_url` are
  plain text columns; file uploads are explicitly out of scope for this
  phase.
- **`profile_views_count` has no writer yet** — the column and its
  privacy boundary exist, but nothing increments it. A future view-tracking
  feature should do so via a `SECURITY DEFINER` function rather than a
  direct client `UPDATE`, to avoid a write path that bypasses the
  aggregate-field protection trigger's intent.
