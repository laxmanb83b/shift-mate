-- Migration 0005 — admin "hide" for postings.
-- Adds a 'hidden' status (kept out of Browse but not deleted) and lets admins
-- update any posting so they can hide/unhide it.

alter table public.postings
  drop constraint if exists postings_status_check;

alter table public.postings
  add constraint postings_status_check
  check (status in ('active', 'filled', 'expired', 'flagged', 'hidden'));

-- Admins can update any posting (e.g. hide/unhide). Owners keep their own
-- update policy; this simply adds admin capability.
drop policy if exists "admin updates any posting" on public.postings;
create policy "admin updates any posting"
  on public.postings for update
  using (public.is_admin());
