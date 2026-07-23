import { createClient } from '@supabase/supabase-js';

let client = null;

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }

  return client;
}

export const ATTACHMENT_BUCKET = 'incident-attachments';

// 60 minutes. Long enough to open a document, short enough that a leaked link
// stops working quickly.
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

// The attachments column stores object paths. Rows written while the bucket was
// public stored a full public URL instead, so both shapes have to be accepted.
// Accepts an attachment object or a bare string.
export function toAttachmentPath(value) {
  const raw = value && typeof value === 'object' ? value.url : value;
  if (!raw) return raw;
  const marker = `/${ATTACHMENT_BUCKET}/`;
  const index = raw.indexOf(marker);
  return index === -1 ? raw : raw.slice(index + marker.length);
}

// Attachments are stored as { url, label, note, note_by, note_at }. `url` holds
// the object path (new) or a full public URL (rows written while the bucket was
// public). Older rows stored a bare string per attachment; normalize both shapes
// so the rest of the app only ever deals with objects.
export function normalizeAttachment(a) {
  if (a && typeof a === 'object' && !Array.isArray(a)) {
    return {
      url: a.url ?? '',
      label: a.label ?? '',
      note: a.note ?? null,
      note_by: a.note_by ?? null,
      note_at: a.note_at ?? null,
    };
  }
  return { url: a ?? '', label: '', note: null, note_by: null, note_at: null };
}

export function normalizeAttachments(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeAttachment);
}

// `value` may be an attachment object or a bare string.
export function attachmentDisplayName(value) {
  const raw = value && typeof value === 'object' ? value.url : value;
  const path = toAttachmentPath(raw) || '';
  try {
    return decodeURIComponent(path.split('/').pop().split('?')[0]);
  } catch {
    return path;
  }
}

// Signed URLs expire, so one is minted per view and never persisted. Storing one
// would leave a dead link in the database an hour later.
export async function createAttachmentSignedUrl(value, expiresIn = SIGNED_URL_TTL_SECONDS) {
  const supabase = getSupabaseClient();
  if (!supabase) return { url: null, error: 'Supabase is not configured' };

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(toAttachmentPath(value), expiresIn);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

export async function signInWithEmail(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase not configured' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  // maybeSingle() returns data: null for "no such row" rather than raising, which
  // keeps a missing profile distinguishable from a genuine failure below.
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // Treating every error as "profile missing" would send an RLS denial or a
  // network blip down the auto-create path, where the insert then collides with
  // the existing primary key and returns undefined — losing the real reason.
  if (error) {
    console.error('Failed to load user profile:', error.message);
    return null;
  }

  if (data) return data;

  // No profile row yet: create one for this user's first sign-in.
  const { data: { user: authUser } } = await supabase.auth.getUser();

  // full_name is NOT NULL, so a new profile needs some placeholder. Deliberately
  // not the email address: storing that makes the header look like it fell back
  // to user.email when it is really rendering full_name, which is impossible to
  // tell apart. A Master Admin can set the real name from the Users screen.
  const { data: newProfile, error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      employee_id: userId,
      full_name: 'Unknown User',
      email: authUser?.email || null,
      role: 'general_user',
      password_changed: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create user profile:', insertError.message);
    return null;
  }

  return newProfile;
}