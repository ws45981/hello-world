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
-- Two steps, because Postgres forbids a subquery inside an ALTER COLUMN ... USING
-- expression:
--   2a. cast text[] -> jsonb with to_jsonb, giving a jsonb array of strings
--   2b. an ordinary UPDATE (subqueries allowed) wraps each string as
--       { url, label:'', note:null, note_by:null, note_at:null }
-- Both are guarded so re-running is a no-op.

-- 2a. Type change only (no per-element transform here).
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
      alter column attachments type jsonb using to_jsonb(attachments);
  end if;

  alter table public.incident_entries alter column attachments set default '[]'::jsonb;
end
$$;

-- Any pre-existing NULL attachments become an empty array.
update public.incident_entries
   set attachments = '[]'::jsonb
 where attachments is null;

-- 2b. Wrap bare-string elements into objects. Objects are left untouched, so
-- this is safe to run again.
update public.incident_entries
   set attachments = coalesce((
         select jsonb_agg(
                  case
                    when jsonb_typeof(elem) = 'object' then elem
                    else jsonb_build_object(
                           'url', elem #>> '{}', 'label', '',
                           'note', null, 'note_by', null, 'note_at', null)
                  end)
           from jsonb_array_elements(attachments) as elem), '[]'::jsonb)
 where jsonb_typeof(attachments) = 'array'
   and exists (
     select 1 from jsonb_array_elements(attachments) as e
      where jsonb_typeof(e) <> 'object');


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
