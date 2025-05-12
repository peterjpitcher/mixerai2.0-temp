import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Helper to create a Supabase client for server components
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
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

// Helper to check if user is admin and redirect if not
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?message=Authentication required');
  }

  // Assuming 'admin' role is stored in app_metadata.roles or a similar field
  // Adjust this logic based on your actual Supabase user role setup
  const isAdmin = user.app_metadata?.roles?.includes('admin') || user.app_metadata?.role === 'admin';

  if (!isAdmin) {
    redirect('/dashboard?error=admin_required');
  }

  return user; // Return the admin user object if needed
} 