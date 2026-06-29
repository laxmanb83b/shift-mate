-- Migration 0002 — run in the SQL Editor if you already created the schema.
-- Adds job categories, a 'filled' status (mark as hired), and a category index.
-- (expires_at / "active till" already exists with a 30-day default.)

-- 1. Category column
alter table public.postings
  add column if not exists category text;

create index if not exists postings_category_idx
  on public.postings (category);

-- 2. Allow the 'filled' status (posting hired / made inactive)
alter table public.postings
  drop constraint if exists postings_status_check;

alter table public.postings
  add constraint postings_status_check
  check (status in ('active', 'filled', 'expired', 'flagged'));

-- 3. Let owners read their own non-active postings (for "My postings")
drop policy if exists "read active postings" on public.postings;
drop policy if exists "read active or own postings" on public.postings;

create policy "read active or own postings"
  on public.postings for select
  using (status = 'active' or auth.uid() = poster_id);

-- 4. Backfill: give any old rows without an expiry a 30-day window from now.
update public.postings
  set expires_at = now() + interval '30 days'
  where expires_at is null;
