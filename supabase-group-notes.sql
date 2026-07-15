-- WorkLog — notes on incident groups
--
-- Run in Supabase: SQL Editor → New query → Run. Idempotent.
--
-- Adds the notes field behind the Add Note / Edit Note action on each group
-- header in All Submissions. No policy changes are needed: the existing
-- "Master admins manage incident groups" policy from supabase-incident-groups.sql
-- is FOR ALL, so it already covers updating this column.

alter table public.incident_groups
  add column if not exists notes text;

-- Verify: expect one row — notes | text | YES
select column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'incident_groups'
   and column_name = 'notes';
