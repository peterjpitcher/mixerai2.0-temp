import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// Create a single supabase client for browser-side usage
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Create a client for server-side usage with service role
export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  
  return createClient<Database>(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}; 