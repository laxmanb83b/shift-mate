-- Migration 0004 — admin: list registered users + their post counts.
-- Listing auth.users requires elevated access, so this is a SECURITY DEFINER
-- function that first checks is_admin(). Admins already have RLS access to read
-- every posting, so per-user posts are fetched with a normal query client-side.

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
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      count(p.id) as posting_count
    from auth.users u
    left join public.postings p on p.poster_id = u.id
    group by u.id, u.email, u.created_at, u.last_sign_in_at
    order by u.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;
