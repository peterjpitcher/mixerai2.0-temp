import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';

// Helper to create a Supabase client for server components
export function createSupabaseServerClient() {
  // Import cookies dynamically to avoid error
  const cookieStore = require('next/headers').cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}

// Helper to check if user is authenticated and redirect if not
export async function requireAuth() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  return session;
}

// Helper to get the current user from supabase
export async function getCurrentUser() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }
  
  return session.user;
} 