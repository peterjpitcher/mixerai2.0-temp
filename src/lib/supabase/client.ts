import { createBrowserClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

// --- Singleton pattern for the browser client ---
let supabaseBrowserClient: SupabaseClient<Database> | undefined;

function getSupabaseBrowserClient() {
  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase client could not be initialised because NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.'
    );
  }
  
  supabaseBrowserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Set session lifetime to 24 hours (in seconds)
      // Note: This needs to be configured in Supabase dashboard as well
      storage: {
        getItem: async (key: string) => {
          if (typeof window === 'undefined') {
            return null;
          }
          return window.localStorage.getItem(key);
        },
        setItem: async (key: string, value: string) => {
          if (typeof window === 'undefined') {
            return;
          }
          try {
            window.localStorage.setItem(key, value);
          } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[SupabaseClient] Failed to persist session to localStorage:', error);
            }
          }
        },
        removeItem: async (key: string) => {
          if (typeof window === 'undefined') {
            return;
          }
          try {
            window.localStorage.removeItem(key);
          } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[SupabaseClient] Failed to remove session from localStorage:', error);
            }
          }
        },
      },
    },
  });
  
  return supabaseBrowserClient;
}
// --- End of singleton pattern ---


// Create a single supabase client for browser-side usage using the new SSR approach
export const createSupabaseClient = () => {
  return getSupabaseBrowserClient();
};

// Create a client for server-side usage with service role
// This should ONLY be used in server contexts (never in client components)
export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error(
      'Supabase admin client could not be initialised because NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.'
    );
  }

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
