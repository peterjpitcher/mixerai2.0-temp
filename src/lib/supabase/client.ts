import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Create a single supabase client for browser-side usage using the new SSR approach
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Create a client for server-side usage with service role
// This should ONLY be used in server contexts (never in client components)
export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  
  // Ensure we're in a server context when using service role
  if (typeof window !== 'undefined') {
    console.error('Attempted to use service role in client context! This is a security risk.');
    throw new Error('Admin client can only be used in server context');
  }
  
  return createClient<Database>(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}; 