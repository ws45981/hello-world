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
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId.toString())
    .single();
  
  if (error || !data) {
    // Auto-create profile if it doesn't exist
    // Get the user's email to use as fallback name
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    const { data: newProfile } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        employee_id: userId,
        full_name: authUser?.email || 'Unknown User',
        email: authUser?.email || null,
        role: 'general_user',
        password_changed: false,
      })
      .select()
      .single();
    return newProfile;
  }
  
  console.log("getUserProfile result:", data);
  return data;
}
}