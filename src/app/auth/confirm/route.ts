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
<body style="margin:0; background:#f4f7fb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#0f172a;">
  <div style="display:flex; align-items:center; justify-content:center; min-height:100vh; padding:32px 16px;">
    <form method="post" style="background:#ffffff; padding:36px 32px; border-radius:16px; box-shadow:0 20px 40px rgba(15,23,42,0.12); max-width:420px; width:100%; text-align:center;">
      <h1 style="font-size:24px; margin:0 0 12px 0;">Finish password reset</h1>
      <p style="margin:0 0 20px 0; color:#475569; font-size:15px; line-height:1.55;">Click continue to securely confirm your identity and choose a new password for MixerAI.</p>
      <button type="submit" style="display:inline-block; background:#13599f; color:#ffffff; border:none; border-radius:10px; padding:12px 24px; font-weight:600; cursor:pointer; font-size:15px;">Continue</button>
      <p style="margin:20px 0 0 0; font-size:13px; color:#64748b; line-height:1.6;">Emails can take up to five minutes to arrive. If nothing shows up after fifteen minutes, message Peter Pitcher on Teams and we&apos;ll help you finish the reset.</p>
      <p style="margin:16px 0 0 0; font-size:12px; color:#94a3b8;">Didn’t request this? You can safely close this window.</p>
    </form>
  </div>
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
