-- WorkLog — Incident Grouping
--
-- Run in Supabase: SQL Editor → New query → Run. Idempotent.
--
-- Adds the two tables behind the Incident Grouping feature in All Submissions,
-- restricted to Master Admins. Depends on public.is_master_admin(), created by
-- supabase-secure-rls.sql — run that first if you have not.

-- 1. Tables --------------------------------------------------------------------

create table if not exists public.incident_groups (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  incident_date text,
  incident_time text,
  created_at    timestamptz not null default now(),
  created_by    text
);

-- Junction table: a submission may belong to many groups, and a group holds many
-- submissions.
--
--   on delete cascade (group_id) — deleting a group dissolves its membership
--     rows but never touches incident_entries, so the submissions survive.
--   unique (group_id, entry_id)  — a submission cannot be added to the same
--     group twice.
--
-- NOTE: entry_id is text, not uuid, because incident_entries.id is text.
create table if not exists public.incident_group_entries (
  id       uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.incident_groups(id) on delete cascade,
  entry_id text not null references public.incident_entries(id) on delete cascade,
  unique (group_id, entry_id)
);

create index if not exists incident_group_entries_group_id_idx
  on public.incident_group_entries (group_id);

create index if not exists incident_group_entries_entry_id_idx
  on public.incident_group_entries (entry_id);


-- 2. Row-level security --------------------------------------------------------
-- Grouping lives in the Master Admin-only All Submissions view, so both tables
-- are Master Admin-only. Everyone else sees nothing and can change nothing.

alter table public.incident_groups        enable row level security;
alter table public.incident_group_entries enable row level security;

drop policy if exists "Master admins manage incident groups" on public.incident_groups;
create policy "Master admins manage incident groups"
  on public.incident_groups
  for all
  to authenticated
  using (public.is_master_admin())
  with check (public.is_master_admin());

drop policy if exists "Master admins manage incident group entries" on public.incident_group_entries;
create policy "Master admins manage incident group entries"
  on public.incident_group_entries
  for all
  to authenticated
  using (public.is_master_admin())
  with check (public.is_master_admin());


-- 3. Verify --------------------------------------------------------------------

-- Expect both tables with their columns.
select table_name, column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('incident_groups', 'incident_group_entries')
 order by table_name, ordinal_position;

-- Expect one ALL policy per table, scoped to {authenticated}.
select tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
   and tablename in ('incident_groups', 'incident_group_entries');
