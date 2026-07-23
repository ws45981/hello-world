-- WorkLog — attachment metadata, submission lock/hide, and enforcing RLS
--
-- Run in Supabase: SQL Editor → New query → Run. Idempotent.
--
-- Covers three code changes at once:
--   * attachments becomes a list of objects { url, label, note, note_by, note_at }
--   * new columns: locked / locked_at / locked_by, hidden_from_user
--   * the read and update policies are tightened so lock and hide are enforced by
--     the database, not only hidden in the UI. Without this, any signed-in user
--     could still edit a locked entry or read a hidden one via the API.
--
-- DEPENDS ON public.is_master_admin(), from supabase-secure-rls.sql.

-- 1. New columns ---------------------------------------------------------------

alter table public.incident_entries
  add column if not exists locked            boolean not null default false,
  add column if not exists locked_at         timestamptz,
  add column if not exists locked_by         text,
  add column if not exists hidden_from_user  boolean not null default false;


-- 2. attachments: text[] of urls  ->  jsonb of objects -------------------------
--
-- Existing rows hold a Postgres text[] of paths/urls. Each string becomes
-- { url, label:'', note:null, note_by:null, note_at:null }. Guarded by the column
-- type so re-running after the migration is a no-op.

do $$
declare
  col_type text;
begin
  select data_type into col_type
    from information_schema.columns
   where table_schema = 'public'
     and table_name   = 'incident_entries'
     and column_name  = 'attachments';

  if col_type = 'ARRAY' then
    alter table public.incident_entries alter column attachments drop default;

    alter table public.incident_entries
      alter column attachments type jsonb
      using (
        coalesce(
          (select jsonb_agg(jsonb_build_object(
                     'url', e, 'label', '', 'note', null, 'note_by', null, 'note_at', null))
             from unnest(attachments) as e),
          '[]'::jsonb)
      );

    alter table public.incident_entries alter column attachments set default '[]'::jsonb;

  elsif col_type = 'jsonb' then
    alter table public.incident_entries alter column attachments set default '[]'::jsonb;
  end if;
end
$$;


-- 3. Enforce lock and hide in RLS ----------------------------------------------
--
-- Replaces the two policies from supabase-secure-rls.sql. Master Admins keep full
-- access. For everyone else:
--   * read is limited to their own rows that are not hidden
--   * update is limited to their own rows that are not locked and not hidden,
--     so a locked entry can no longer be edited or soft-deleted by its author
--
-- Soft delete goes through UPDATE (status = 'deleted'), and there is no DELETE
-- policy, so the update rule covers deletion too.

drop policy if exists "Read own entries or admin" on public.incident_entries;
create policy "Read own entries or admin"
  on public.incident_entries
  for select
  to authenticated
  using (
    public.is_master_admin()
    or (employee_id = auth.uid()::text and hidden_from_user is not true)
  );

drop policy if exists "Update own entries or admin" on public.incident_entries;
create policy "Update own entries or admin"
  on public.incident_entries
  for update
  to authenticated
  using (
    public.is_master_admin()
    or (employee_id = auth.uid()::text and locked is not true and hidden_from_user is not true)
  )
  with check (
    public.is_master_admin()
    or (employee_id = auth.uid()::text and locked is not true and hidden_from_user is not true)
  );


-- 4. Verify --------------------------------------------------------------------

-- Expect attachments | jsonb, plus the four new columns.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'incident_entries'
   and column_name in ('attachments', 'locked', 'locked_at', 'locked_by', 'hidden_from_user')
 order by column_name;

-- Spot-check one converted row: attachments should be a jsonb array of objects.
select id, jsonb_typeof(attachments) as attachments_type
  from public.incident_entries
 limit 5;
