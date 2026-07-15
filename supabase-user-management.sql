-- WorkLog — User Management support
--
-- Run this in the Supabase dashboard: SQL Editor → New query → Run.
-- Every statement is idempotent, so it is safe to run more than once.
--
-- Adds the two columns the User Management screen depends on, keeps email in
-- sync with auth.users, and grants Master Admins the row-level access needed to
-- read and edit other people's profiles.

-- 1. Columns ------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists email text;

alter table public.user_profiles
  add column if not exists excluded_categories text[] not null default '{}'::text[];

-- 2. Backfill email for existing users ----------------------------------------

update public.user_profiles p
   set email = u.email
  from auth.users u
 where u.id::text = p.id
   and p.email is distinct from u.email;

-- 3. Keep email current on signup and on address changes ----------------------

create or replace function public.sync_user_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
     set email = new.email
   where id = new.id::text;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_sync on auth.users;
create trigger on_auth_user_email_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_user_profile_email();

-- 4. Role lookup used by the policies below ------------------------------------
--
-- SECURITY DEFINER is required, not incidental: these policies live ON
-- user_profiles and need to read user_profiles to learn the caller's role. A
-- plain subquery would re-enter the same policy and fail with infinite
-- recursion. A definer-rights function runs with the owner's privileges, which
-- bypasses RLS and breaks the cycle.

create or replace function public.is_master_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
      from public.user_profiles
     where id = auth.uid()::text
       and role = 'master_admin'
  );
$$;

-- 5. Policies ------------------------------------------------------------------
--
-- Postgres OR's permissive policies together, so these widen access for Master
-- Admins without narrowing what any existing policy already allows.
-- NOTE: user_profiles.id is text while auth.uid() is uuid, hence the cast.

drop policy if exists "Master admins can read all profiles" on public.user_profiles;
create policy "Master admins can read all profiles"
  on public.user_profiles
  for select
  to authenticated
  using (public.is_master_admin() or id = auth.uid()::text);

drop policy if exists "Master admins can update any profile" on public.user_profiles;
create policy "Master admins can update any profile"
  on public.user_profiles
  for update
  to authenticated
  using (public.is_master_admin())
  with check (public.is_master_admin());

-- 6. Verify --------------------------------------------------------------------
-- Expect two rows: email | text, excluded_categories | ARRAY

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'user_profiles'
   and column_name in ('email', 'excluded_categories')
 order by column_name;
