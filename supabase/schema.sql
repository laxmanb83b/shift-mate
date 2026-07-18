-- ============================================================
-- Part-Time Job Board — Supabase schema (run in SQL Editor)
-- ============================================================

-- 1. POSTINGS ------------------------------------------------
create table if not exists public.postings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  poster_id     uuid references auth.users(id) on delete set null,
  title         text not null,
  description   text,
  contact_name  text,
  contact_phone text,
  contact_email text,
  location_text text,
  category      text,                               -- e.g. 'Food & Café', 'Delivery'
  lat           double precision,
  lng           double precision,
  image_url     text,
  status        text not null default 'active'
                 check (status in ('active','filled','expired','flagged')),
  -- 'active till' — defaults to 30 days from creation.
  expires_at    timestamptz default (now() + interval '30 days')
);

create index if not exists postings_status_created_idx
  on public.postings (status, created_at desc);
create index if not exists postings_category_idx
  on public.postings (category);

-- 2. REPORTS (community moderation) --------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  posting_id  uuid not null references public.postings(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now()
);

-- 3. ROW LEVEL SECURITY --------------------------------------
alter table public.postings enable row level security;
alter table public.reports  enable row level security;

-- Anyone (even anonymous) can read active postings; owners can also read
-- their own postings in any status (so "My postings" shows filled/expired).
create policy "read active or own postings"
  on public.postings for select
  using (status = 'active' or auth.uid() = poster_id);

-- Anyone can create a posting (MVP allows anonymous posting).
-- Tighten to (auth.uid() = poster_id) once you require sign-in.
create policy "insert postings"
  on public.postings for insert
  with check (true);

-- Only the owner can update/delete their own posting.
create policy "owner updates posting"
  on public.postings for update
  using (auth.uid() = poster_id);

create policy "owner deletes posting"
  on public.postings for delete
  using (auth.uid() = poster_id);

-- Anyone can file a report; nobody can read them from the client.
create policy "insert reports"
  on public.reports for insert
  with check (true);

-- 4. STORAGE BUCKETS -----------------------------------------
-- Run once. 'pending-images' is private (holds un-moderated uploads);
-- 'posting-images' is public (holds approved images).
insert into storage.buckets (id, name, public)
  values ('pending-images', 'pending-images', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('posting-images', 'posting-images', true)
  on conflict (id) do nothing;

-- Allow uploads to the pending bucket (the Edge Function moves approved files).
create policy "upload pending images"
  on storage.objects for insert
  with check (bucket_id = 'pending-images');

create policy "read public posting images"
  on storage.objects for select
  using (bucket_id = 'posting-images');

-- 5. AUTO-EXPIRE HELPER (optional) ---------------------------
-- Call from a scheduled task / pg_cron to hide old gigs:
--   update public.postings set status='expired'
--   where status='active' and expires_at < now();

-- 6. ADMIN MODERATION ----------------------------------------
-- One row per admin user. is_admin() is SECURITY DEFINER so it can check
-- membership without tripping RLS recursion.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Admins can read every posting and delete any of them.
create policy "admin reads all postings"
  on public.postings for select using (public.is_admin());
create policy "admin deletes any posting"
  on public.postings for delete using (public.is_admin());

-- Admins can read and dismiss (delete) reports.
create policy "admin reads reports"
  on public.reports for select using (public.is_admin());
create policy "admin deletes reports"
  on public.reports for delete using (public.is_admin());

-- Make yourself admin after signing in once (see migration 0003 for steps):
--   insert into public.admins (user_id) values ('YOUR-USER-UUID');

-- Admin: list registered users + their post counts (admin-only, SECURITY DEFINER).
create or replace function public.admin_list_users()
returns table (
  id            uuid,
  email         text,
  created_at    timestamptz,
  last_sign_in  timestamptz,
  posting_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, count(p.id)
    from auth.users u
    left join public.postings p on p.poster_id = u.id
    group by u.id, u.email, u.created_at, u.last_sign_in_at
    order by u.created_at desc;
end;
$$;
grant execute on function public.admin_list_users() to authenticated;
