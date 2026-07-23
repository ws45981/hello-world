-- WorkLog — unlock request system
--
-- Run in Supabase: SQL Editor → New query → Run. Idempotent.
--
-- Lets a user ask a Master Admin to unlock one of their locked submissions, and
-- notifies them once it is unlocked.
--
-- DEPENDS ON public.is_master_admin(), from supabase-secure-rls.sql.

-- 1. Table ---------------------------------------------------------------------
-- requested_by / resolved_by hold profile ids (which equal the auth uid), so the
-- policies below can key off them.

create table if not exists public.unlock_requests (
  id           uuid primary key default gen_random_uuid(),
  entry_id     text not null references public.incident_entries(id) on delete cascade,
  requested_by text,
  requested_at timestamptz not null default now(),
  reason       text,
  status       text not null default 'pending',
  resolved_at  timestamptz,
  resolved_by  text,
  admin_note   text
);

create index if not exists unlock_requests_status_idx   on public.unlock_requests (status);
create index if not exists unlock_requests_entry_id_idx on public.unlock_requests (entry_id);


-- 2. Notification flag on the entry --------------------------------------------
-- Set true when an admin unlocks in response to a request; cleared once the user
-- has seen the banner.

alter table public.incident_entries
  add column if not exists unlock_notification boolean not null default false;


-- 3. Row-level security --------------------------------------------------------

alter table public.unlock_requests enable row level security;

-- A user files a request only in their own name.
drop policy if exists "Users create own unlock requests" on public.unlock_requests;
create policy "Users create own unlock requests"
  on public.unlock_requests
  for insert
  to authenticated
  with check (requested_by = auth.uid()::text);

-- A user sees their own requests; a Master Admin sees all of them.
drop policy if exists "Read own unlock requests or admin" on public.unlock_requests;
create policy "Read own unlock requests or admin"
  on public.unlock_requests
  for select
  to authenticated
  using (public.is_master_admin() or requested_by = auth.uid()::text);

-- Only a Master Admin resolves a request.
drop policy if exists "Admins resolve unlock requests" on public.unlock_requests;
create policy "Admins resolve unlock requests"
  on public.unlock_requests
  for update
  to authenticated
  using (public.is_master_admin())
  with check (public.is_master_admin());

-- NOTE: clearing unlock_notification is a normal owner update on
-- incident_entries. By the time the flag is true the entry is already unlocked
-- (locked = false), so the existing "Update own entries or admin" policy from
-- supabase-lock-hide-attachments.sql already permits it. No change needed here.


-- 4. Verify --------------------------------------------------------------------

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'unlock_requests'
 order by ordinal_position;

select column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'incident_entries'
   and column_name = 'unlock_notification';

select policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename = 'unlock_requests'
 order by policyname;
