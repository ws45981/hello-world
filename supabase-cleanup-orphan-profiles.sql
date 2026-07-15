-- WorkLog — remove orphaned user_profiles rows
--
-- Run in Supabase: SQL Editor → New query → Run.
--
-- WHY
--   Three profiles have no matching row in auth.users:
--     6472d9dc-8f11-4b13-bcb6-a9cbadc0f7db  (no name, no email)
--     59cc3ac2-b0ac-4628-8d34-fed88e2ee04a  (test123@gmail.com)
--     021053ae-3b77-4f9c-b2f3-ab71500b02df  (testly123@gmail.com)
--   Nobody can sign in as them, but the Users screen lists every profile, so
--   they appear as blank-named ghost rows.
--
-- These statements match on "has no auth user" rather than on hardcoded ids, so
-- they stay correct if the set has changed since. Run step 1 and read it before
-- running step 2.

-- 1. Preview: exactly what step 2 would remove, and what each one owns ---------
--
-- Check the `entries` column. A profile that owns incident entries is NOT
-- deleted by step 2 — removing it would strand those entries with an
-- employee_id nobody matches, making them visible only to Master Admins.

select
  p.id,
  p.full_name,
  p.email,
  p.role,
  (select count(*) from public.incident_entries e where e.employee_id = p.id) as entries,
  case
    when exists (select 1 from public.incident_entries e where e.employee_id = p.id)
      then 'KEPT — owns entries, delete skipped'
    else 'will be deleted'
  end as outcome
  from public.user_profiles p
 where not exists (
   select 1 from auth.users u where u.id::text = p.id
 )
 order by p.email nulls first;


-- 2. Delete orphaned profiles that own nothing --------------------------------

delete from public.user_profiles p
 where not exists (
   select 1 from auth.users u where u.id::text = p.id
 )
   and not exists (
   select 1 from public.incident_entries e where e.employee_id = p.id
 );


-- 3. Verify -------------------------------------------------------------------

-- Expect 0 (or only rows the preview flagged as KEPT).
select count(*) as remaining_orphans
  from public.user_profiles p
 where not exists (
   select 1 from auth.users u where u.id::text = p.id
 );

-- Expect 0. Confirms no entry was stranded by the delete.
select count(*) as orphaned_entries
  from public.incident_entries e
 where not exists (
   select 1 from public.user_profiles p where p.id = e.employee_id
 );
