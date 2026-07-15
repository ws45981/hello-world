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