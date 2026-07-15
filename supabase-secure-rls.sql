-- WorkLog — lock down row-level security
--
-- Run in Supabase: SQL Editor → New query → paste → Run. Idempotent.
--
-- WHY
--   public.incident_entries is currently readable by anyone presenting the anon
--   key. That key is shipped inside the browser bundle, so "anyone" means any
--   visitor to the site — no login required. This replaces blanket
--   `using (true)` access with owner-scoped access plus a Master Admin override.
--
-- SCOPE / WARNING
--   Step 2 DROPS EVERY EXISTING POLICY on incident_entries and user_profiles and
--   replaces them with the set below. That is deliberate: it guarantees a known
--   end state rather than layering onto policies we cannot see. Run step 0 first
--   if you want a record of the current configuration.
--
-- SAFETY
--   An RLS-enabled table with no policies denies all access. So if this script
--   fails midway, the tables fail closed (locked), never open.

-- 0. Optional: inspect what exists today. Run this on its own first.
--
-- select tablename, policyname, cmd, roles, qual, with_check
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('incident_entries', 'user_profiles')
--  order by tablename, policyname;


-- 1. Helper --------------------------------------------------------------------
-- SECURITY DEFINER is required, not incidental: these policies live ON
-- user_profiles and must read user_profiles to learn the caller's role. A plain
-- subquery would re-enter the same policy and fail with infinite recursion.
-- Definer rights bypass RLS and break the cycle.

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


-- 2. Clear existing policies ---------------------------------------------------

do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('incident_entries', 'user_profiles')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end
$$;

alter table public.incident_entries enable row level security;
alter table public.user_profiles    enable row level security;


-- 3. incident_entries ----------------------------------------------------------
-- NOTE: ids are text while auth.uid() is uuid, hence the cast throughout.

-- Read your own entries; Master Admins read everything.
create policy "Read own entries or admin"
  on public.incident_entries
  for select
  to authenticated
  using (employee_id = auth.uid()::text or public.is_master_admin());

-- File entries only under your own id. This blocks forging a submission in
-- someone else's name. The app always stamps employee_id with the signed-in
-- user, Master Admins included, so nothing legitimate needs the override.
create policy "Insert entries as self"
  on public.incident_entries
  for insert
  to authenticated
  with check (employee_id = auth.uid()::text);

-- Edit your own entries; Master Admins edit any. This one policy covers form
-- edits, the soft-delete status flag, permanently_deleted, restore, and the
-- reviewed flag — all of which are UPDATEs. WITH CHECK additionally stops a
-- non-admin reassigning an entry to a different employee.
create policy "Update own entries or admin"
  on public.incident_entries
  for update
  to authenticated
  using (employee_id = auth.uid()::text or public.is_master_admin())
  with check (employee_id = auth.uid()::text or public.is_master_admin());

-- Deliberately NO delete policy. The app never hard-deletes — deletion is a
-- soft `status = 'deleted'` update — so no one may remove rows over the API.


-- 4. user_profiles -------------------------------------------------------------

create policy "Read own profile or admin"
  on public.user_profiles
  for select
  to authenticated
  using (id = auth.uid()::text or public.is_master_admin());

-- Required by getUserProfile(), which creates the profile row on first login.
create policy "Insert own profile"
  on public.user_profiles
  for insert
  to authenticated
  with check (id = auth.uid()::text);

-- Users need this to set password_changed after a forced password change.
-- Master Admins need it for the User Management screen. Step 5 stops it from
-- becoming a self-promotion route.
create policy "Update own profile or admin"
  on public.user_profiles
  for update
  to authenticated
  using (id = auth.uid()::text or public.is_master_admin())
  with check (id = auth.uid()::text or public.is_master_admin());


-- 5. Block privilege escalation ------------------------------------------------
-- Without this, "update own profile" above would let any user set their own role
-- to master_admin. RLS cannot express per-column rules, so a trigger enforces it.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_master_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Only a Master Admin can change a user role';
  end if;

  if new.excluded_categories is distinct from old.excluded_categories then
    raise exception 'Only a Master Admin can change category restrictions';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_privileges_trigger on public.user_profiles;
create trigger guard_profile_privileges_trigger
  before update on public.user_profiles
  for each row execute function public.guard_profile_privileges();


-- 6. Verify --------------------------------------------------------------------

-- Expect 6 policies, all scoped to {authenticated}, and no DELETE row.
select tablename, cmd, policyname, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('incident_entries', 'user_profiles')
 order by tablename, cmd, policyname;

-- Expect 0. Any entry whose employee_id matches no profile becomes visible only
-- to Master Admins after this change (nothing is lost — admins still see all).
select count(*) as orphaned_entries
  from public.incident_entries e
 where not exists (
   select 1 from public.user_profiles p where p.id = e.employee_id
 );
