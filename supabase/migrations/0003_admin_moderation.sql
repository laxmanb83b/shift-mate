-- Migration 0003 — admin moderation.
-- Adds an admins table + is_admin() helper, and policies letting an admin
-- read reports and delete ANY posting (for reviewing reported posts).

-- 1. Admins table (one row per admin user)
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No client-facing policies: membership is only checked via is_admin() below,
-- which runs as SECURITY DEFINER and bypasses RLS (avoids policy recursion).

-- 2. is_admin() — true if the current user is in admins.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- 3. Postings: admins can read every posting and delete any of them.
drop policy if exists "admin reads all postings" on public.postings;
create policy "admin reads all postings"
  on public.postings for select
  using (public.is_admin());

drop policy if exists "admin deletes any posting" on public.postings;
create policy "admin deletes any posting"
  on public.postings for delete
  using (public.is_admin());

-- 4. Reports: admins can read and delete (dismiss) reports.
drop policy if exists "admin reads reports" on public.reports;
create policy "admin reads reports"
  on public.reports for select
  using (public.is_admin());

drop policy if exists "admin deletes reports" on public.reports;
create policy "admin deletes reports"
  on public.reports for delete
  using (public.is_admin());

-- 5. HOW TO MAKE YOURSELF ADMIN ------------------------------------------
-- a) Sign in to the app once with the email you want as admin (creates the
--    auth user).
-- b) Find your user id:  Dashboard → Authentication → Users  (copy the UUID),
--    or run:  select id, email from auth.users;
-- c) Grant admin:
--      insert into public.admins (user_id) values ('YOUR-USER-UUID');
--    To revoke:  delete from public.admins where user_id = 'YOUR-USER-UUID';
