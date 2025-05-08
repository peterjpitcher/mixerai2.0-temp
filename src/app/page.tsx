import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';

export default async function Home() {
  // Check authentication status
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Redirect based on authentication status
  if (session) {
    redirect('/dashboard');
        } else {
    redirect('/auth/login');
  }
}
