import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';

const READONLY_COOKIES_ERROR_FRAGMENT =
  'Cookies can only be modified in a Server Action or Route Handler';
let loggedReadonlyWarning = false;

function isReadonlyCookiesError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    error.message.includes(READONLY_COOKIES_ERROR_FRAGMENT)
  );
}

function handleReadonlyCookiesError(error: unknown) {
  if (!isReadonlyCookiesError(error)) {
    return false;
  }

  if (!loggedReadonlyWarning) {
    loggedReadonlyWarning = true;
    console.warn(
      '[Supabase] Skipped writing auth cookies during a Server Components render. Session refresh will happen on the next mutable request (Route Handler or Server Action).',
      error
    );
  }

  return true;
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const rawSet = Reflect.get(cookieStore, 'set');
  const rawDelete = Reflect.get(cookieStore, 'delete');

  const setFn =
    typeof rawSet === 'function'
      ? ((rawSet as (options: { name: string; value: string } & CookieOptions) => void).bind(
          cookieStore
        ) as (options: { name: string; value: string } & CookieOptions) => void)
      : undefined;
  const deleteFn =
    typeof rawDelete === 'function'
      ? ((rawDelete as (
          nameOrOptions: string | ({ name: string } & CookieOptions)
        ) => void).bind(cookieStore) as (
          nameOrOptions: string | ({ name: string } & CookieOptions)
        ) => void)
      : undefined;

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions = {}) {
          if (typeof setFn !== 'function') {
            return;
          }

          const enhancedOptions: CookieOptions = {
            ...options,
            path: options.path ?? '/',
            maxAge: options.maxAge ?? 24 * 60 * 60,
            sameSite: options.sameSite ?? 'lax',
            secure: options.secure ?? process.env.NODE_ENV === 'production',
            httpOnly: options.httpOnly ?? true,
          };

          try {
            setFn({ name, value, ...enhancedOptions });
          } catch (error) {
            if (!handleReadonlyCookiesError(error)) {
              throw error;
            }
          }
        },
        async remove(name: string, options: CookieOptions = {}) {
          if (typeof deleteFn === 'function') {
            try {
              if (options && Object.keys(options).length > 0) {
                deleteFn({ name, ...options });
              } else {
                deleteFn(name);
              }
            } catch (error) {
              if (!handleReadonlyCookiesError(error)) {
                throw error;
              }
            }
            return;
          }

          if (typeof setFn !== 'function') {
            return;
          }

          const removalOptions: CookieOptions = {
            ...options,
            path: options.path ?? '/',
            sameSite: options.sameSite ?? 'lax',
            secure: options.secure ?? process.env.NODE_ENV === 'production',
            httpOnly: options.httpOnly ?? true,
            maxAge: 0,
          };

          try {
            setFn({ name, value: '', ...removalOptions });
          } catch (error) {
            if (!handleReadonlyCookiesError(error)) {
              throw error;
            }
          }
        },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );
}
