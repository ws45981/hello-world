-- WorkLog — make attachments private
--
-- Run in Supabase: SQL Editor → New query → Run. Idempotent.
--
-- WHY
--   incident-attachments is a public bucket, so every attachment on a PHI report
--   is fetchable by URL with no login at all. This flips it to private and adds
--   the object policies the app needs to keep working.
--
-- IMPORTANT
--   Flipping the bucket alone is not enough, and doing only that would break
--   attachments. createSignedUrl() is itself an authorised read: it checks the
--   RLS policies on storage.objects. With the bucket private and no policies,
--   nobody — including the uploader — could sign a URL for their own file.
--
-- DEPENDS ON
--   public.is_master_admin(), from supabase-secure-rls.sql.
--
-- PATH CONVENTION
--   The app uploads to `<profile_id>/<timestamp>-<index>-<filename>`, so the
--   first folder segment is the owner's id. Every policy below keys off that via
--   storage.foldername(name)[1]. Files uploaded before this change used the same
--   convention, so they stay reachable.

-- 0. Optional: inspect existing storage policies before changing anything.
--
-- select policyname, cmd, roles, qual, with_check
--   from pg_policies
--  where schemaname = 'storage' and tablename = 'objects'
--  order by policyname;


-- 1. Flip the bucket to private ------------------------------------------------

update storage.buckets
   set public = false
 where id = 'incident-attachments';


-- 2. Drop the permissive legacy policies ---------------------------------------
--
-- These two were created before this change and check only bucket_id, with no
-- ownership test:
--
--   "Authenticated users can read"    qual:       bucket_id = 'incident-attachments'
--   "Authenticated users can upload"  with_check: bucket_id = 'incident-attachments'
--
-- Postgres OR's permissive policies together, so leaving either in place makes
-- the scoped policies in step 3 decorative: any signed-in user could still read
-- every attachment, and write into any other user's folder. Both are confined to
-- this bucket, so dropping them affects nothing else.

drop policy if exists "Authenticated users can read" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;


-- 3. Object policies -----------------------------------------------------------
-- Scoped by bucket_id so other buckets are unaffected.

drop policy if exists "Read own attachments or admin" on storage.objects;
create policy "Read own attachments or admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'incident-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_master_admin()
    )
  );

drop policy if exists "Upload own attachments" on storage.objects;
create policy "Upload own attachments"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'incident-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Needed by the "delete submission and attachments" flow.
drop policy if exists "Delete own attachments or admin" on storage.objects;
create policy "Delete own attachments or admin"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'incident-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_master_admin()
    )
  );


-- 4. Verify --------------------------------------------------------------------

-- Expect public = false.
select id, public
  from storage.buckets
 where id = 'incident-attachments';

-- Expect EXACTLY these three, and nothing else:
--   Delete own attachments or admin | DELETE
--   Read own attachments or admin   | SELECT
--   Upload own attachments          | INSERT
--
-- Any extra policy naming this bucket without an ownership test re-opens it,
-- because permissive policies are OR'd. Check the qual column, not just the name.
select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'storage'
   and tablename = 'objects'
 order by policyname;


-- IF STEP 2 FAILS with "must be owner of table objects", your project restricts
-- policy creation on storage.objects from the SQL editor. Create the same three
-- policies through Storage → Policies → incident-attachments in the dashboard
-- instead; the using / with check expressions above transfer verbatim.
