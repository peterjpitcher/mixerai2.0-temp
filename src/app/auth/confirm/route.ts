import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { processInviteCompletion } from '@/lib/auth/invite-completion-service';

const STATE_COOKIE = 'mixerai-reset-state';
const STATE_COOKIE_PATH = '/auth/confirm';
const STATE_TTL_SECONDS = 5 * 60;

type StatePayload = {
  token_hash: string;
  type: EmailOtpType;
  next: string;
};

const ALLOWED_TYPES: EmailOtpType[] = ['recovery', 'invite', 'magiclink', 'email', 'email_change', 'signup'];

function encodeState(state: StatePayload): string {
  return Buffer.from(JSON.stringify(state), 'utf8').toString('base64url');
}

function decodeState(raw: string | null | undefined): StatePayload | null {
  if (!raw) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as StatePayload;
    if (parsed && typeof parsed.token_hash === 'string' && typeof parsed.next === 'string') {
      return parsed;
    }
  } catch {
    // no-op
  }

  return null;
}

function sanitizeNext(nextParam: string | null): string {
  const fallback = '/auth/update-password';
  if (!nextParam) {
    return fallback;
  }

  try {
    const trimmed = nextParam.trim();
    if (!trimmed) {
      return fallback;
    }

    const collapsed = trimmed.replace(/\s+/g, '');
    return collapsed.startsWith('/') ? collapsed : fallback;
  } catch {
    return fallback;
  }
}

function buildHtml(): string {
  return `<!doctype html>
<meta name="robots" content="noindex">
<title>Confirm Password Reset</title>
<body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f1f5f9; color: #0f172a; margin: 0;">
  <form method="post" style="background: white; padding: 32px; border-radius: 12px; box-shadow: 0 10px 30px rgba(15,23,42,0.08); text-align: center; max-width: 360px; width: 100%;">
    <h1 style="font-size: 1.5rem; margin-bottom: 0.75rem;">Finish password reset</h1>
    <p style="margin-bottom: 1.5rem; color: #475569;">Click continue to securely confirm your identity and choose a new password.</p>
    <button type="submit" style="background: #13599f; color: white; border: none; border-radius: 8px; padding: 0.75rem 1.5rem; font-weight: 600; cursor: pointer;">Continue</button>
    <p style="margin-top: 1rem; font-size: 0.75rem; color: #64748b;">If you didn’t request this, you can safely close this page.</p>
  </form>
</body>`;
}

function buildErrorRedirect(request: NextRequest, code: string) {
  const url = new URL('/auth/login', request.url);
  url.searchParams.set('error', code);
  return url;
}

export function HEAD() {
  return new Response(null, { status: 204 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');

  if (!tokenHash) {
    return NextResponse.redirect(buildErrorRedirect(request, 'reset_missing_token'));
  }

  const rawType = (url.searchParams.get('type') || 'recovery').toLowerCase() as EmailOtpType;
  const type = ALLOWED_TYPES.includes(rawType) ? rawType : 'recovery';
  const next = sanitizeNext(url.searchParams.get('next'));

  const response = new NextResponse(buildHtml(), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });

  response.cookies.set({
    name: STATE_COOKIE,
    value: encodeState({ token_hash: tokenHash, type, next }),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: STATE_TTL_SECONDS,
    path: STATE_COOKIE_PATH,
  });

  return response;
}

export async function POST(request: NextRequest) {
  const state = decodeState(request.cookies.get(STATE_COOKIE)?.value);

  if (!state) {
    return NextResponse.redirect(buildErrorRedirect(request, 'reset_missing_state'));
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: state.type,
    token_hash: state.token_hash,
  });

  let redirectUrl: URL;
  let inviteCompletionFailed = false;

  if (error) {
    const message = error.message?.toLowerCase() ?? '';
    const code = message.includes('expired') ? 'reset_expired' : 'reset_invalid';
    redirectUrl = buildErrorRedirect(request, code);
  } else {
    if (state.type === 'invite') {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const adminClient = createSupabaseAdminClient();
          const result = await processInviteCompletion(user, adminClient);
          if (!result.success) {
            inviteCompletionFailed = true;
          }
        }
      } catch (inviteError) {
        console.error('[auth/confirm] Failed to complete invite metadata', inviteError);
        inviteCompletionFailed = true;
      }
    }

    redirectUrl = inviteCompletionFailed
      ? buildErrorRedirect(request, 'invite_completion_failed')
      : new URL(sanitizeNext(state.next), request.url);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: STATE_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: 0,
    path: STATE_COOKIE_PATH,
  });

  return response;
}
