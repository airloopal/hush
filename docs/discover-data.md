# Discover & creator profile data layer (Launch Sprint L2)

How Discover and the creator profile page get real data, and the specific
simplifications/decisions made connecting them to Supabase while keeping
the UI unchanged.

## Architecture

```
Discover / Creator Profile (Client Components, unchanged JSX)
        │
        ▼
getClientCreatorRepository()  (lib/repositories/creator-repository-client.ts)
        │
        ├─ demo mode  → demoCreatorRepository       (MOCK_CREATORS, lib/discovery.ts)
        └─ real mode  → supabaseCreatorRepositoryBrowser
                              │
                              ▼
                     lib/repositories/supabase/creator-queries.ts
                              │
                              ▼
                     public.public_creator_profiles / public_creator_categories
                     (approved + active only — see migration 20260701000012)
```

Both repository implementations return `DiscoverCreator` (`lib/discover-types.ts`)
— the shape the presentation components (`CreatorTile`, `CreatorSection`,
the creator profile page) actually render. `MockCreator` already satisfies
this shape structurally; `toDiscoverCreator()` adapts a Supabase row into
the same shape. Neither `CreatorTile` nor `CreatorSection` had to change.

`lib/repositories/supabase/creator-queries.ts` holds the actual query
logic once, shared between the browser-safe repository (used by Discover
and the creator profile page, both Client Components) and the server-only
one in `lib/repositories/supabase/index.ts` (used by server contexts like
the auth callback). Only the Supabase client differs between the two.

## Documented simplifications

- **`availability` → `isOnline`**: the database has three states
  (`available`/`busy`/`offline`); the existing UI's `isOnline` is binary.
  Only `available` counts as online for now. A future pass could show
  `busy` distinctly (e.g. a different badge color) without any data model
  change — the raw value is preserved on `DiscoverCreator.availability`.
- **`lastSeenMinutes` is always 0 for real creators**: there's no
  "last seen N minutes ago" pipeline yet (`profiles.last_seen_at` exists
  but isn't populated by anything, and isn't exposed on the public view).
  Harmless today — the UI only displays it when `isOnline` is false, where
  it currently just reads "Offline" either way.
- **`followers` has no real equivalent** — omitted (`undefined`) rather
  than fabricated, for real creators. Demo creators keep their seeded
  value.
- **Demo-only presentational content never appears on a real creator's
  profile**: `CreatorReviews` (fabricated example reviews) and the
  synthetic "N fans unlocked chat access this week" line in
  `CreatorSocialProof` only render in demo mode — showing fabricated
  activity attributed to a real creator would misrepresent them, so real
  mode either uses genuine data (e.g. `response_rate` is a real column,
  used directly when present) or omits the section entirely.

## Search ranking

Current implementation (`queryCreatorSearch`): a single `ilike` OR-query
across `username`, `display_name`, `headline`, and the primary category
name, then a simple client-side re-rank (exact username match, then
starts-with, then contains, then everything else). This is intentionally
simple and documented as a starting point, not a permanent design.

Evolution path: once search volume justifies it, replace with Postgres
full-text search (a `tsvector` generated column on
`public_creator_profiles`'s underlying columns + a GIN index + `ts_rank`)
or an external search service. `searchCreators(query)`'s signature doesn't
need to change for that — only `queryCreatorSearch`'s implementation.

## Featured ranking (§7)

Current implementation: `order by returning_fans_count desc, completed_conversations_count desc`,
both genuine columns already maintained on `creator_profiles`.

Evolution path: once real engagement events exist (individual unlock/
purchase timestamps, not just running counts), replace with a scored
ranking — e.g. a weighted combination of recency, response rate, and
returning-fan rate — computed on a schedule (a materialized view refreshed
periodically) rather than at request time, so Discover stays fast even as
the creator count grows. `getFeaturedCreators(limit)` doesn't need to
change for that either.

## Why "creator not found" covers three different real states

`getCreatorByUsername()` queries only `public_creator_profiles`, which
already filters to `status = 'approved' AND profiles.status = 'active'`
(migration `20260701000012`). A username that's genuinely nonexistent, one
that's still `pending_review`, and one that's been `suspended` are
**indistinguishable** from this query — it returns `null` for all three.

This is intentional, not a gap: RLS on the raw `creator_profiles` table
only lets a creator read their *own* row regardless of status, or an
admin read anything — a random visitor has no legitimate way to learn
"this account exists but is pending/suspended" (that's account-status and
moderation information, explicitly required to stay private — see §10 of
this sprint and `docs/profiles-and-creators-schema.md`). Showing one
generic "Creator not found" message for all three cases is the
information-non-leaking behavior, not a missed distinction.

## Performance (§9)

- Discover fetches `getApprovedCreators()` and `getFeaturedCreators(8)` in
  a single `Promise.all` on arrival — no request waterfall.
- Search is debounced 300ms and only fires with a non-empty trimmed query.
- Category/availability/sort filtering happens server-side (in the SQL
  query itself, via `.eq()`/`.order()`), not by fetching everything and
  filtering in the browser — except for a search-in-progress, where
  category/chip filtering is still applied client-side over the
  already-ranked search results (avoids a second round-trip per
  keystroke+filter combination).
- All reads go through `public_creator_profiles`/`public_creator_categories`,
  which are plain views over indexed columns (`creator_profiles_status_idx`,
  `creator_profiles_availability_idx`, `creator_profiles_primary_category_idx`,
  `categories_active_sort_idx` — see `supabase/migrations/*_table.sql`);
  no new indexes were needed for this sprint's queries.
- No server-side caching layer (e.g. `unstable_cache`/ISR) was added —
  Discover is a Client Component fetching per-visit, matching its existing
  architecture ("do not redesign"). Worth revisiting once Discover moves
  to a Server Component, which would also remove the loading spinner on
  first paint.

## Adminability (§11)

Nothing about Discover or the creator profile page depends on *how* a
creator becomes approved — they only ever read `public_creator_profiles`,
which already reflects `status = 'approved'` however that transition
happened (direct SQL today, per `docs/supabase-setup.md`; a future admin
UI tomorrow). No change to this sprint's code is needed when admin
tooling is built.

## Known remaining work

- No caching layer yet (see Performance above).
- Search doesn't yet support full-text ranking (see Search ranking above).
- `CreatorRecentPurchases` and `CreatorReviews`/`CreatorSocialProof`'s
  demo-only parts still read from the local demo chat/purchase stores
  (`lib/chat.ts`) for their "recent activity" flavor — there's no real
  conversations/purchases schema yet (explicitly out of scope: "do not
  implement conversations/payments" for this sprint), so a real creator's
  profile simply won't show a "Recent Purchases" section until that
  schema exists.
- `getOwnCreatorProfile`/`updateOwnCreatorProfile` (creator self-service
  editing) remain server-only (`lib/repositories/supabase/index.ts`) and
  aren't wired into any onboarding/settings UI change in this sprint.
