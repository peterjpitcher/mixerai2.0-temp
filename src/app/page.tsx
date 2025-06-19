import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';

/**
 * Home page component for the root path (`/`).
 * This page checks the user's authentication status and redirects them accordingly:
 * - Authenticated users are redirected to `/dashboard`.
 * - Unauthenticated users are redirected to `/auth/login`.
 */
export default async function Home() {
  // Check authentication status
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Redirect based on authentication status
  if (user) {
    redirect('/dashboard');
        } else {
    redirect('/auth/login');
  }
}
