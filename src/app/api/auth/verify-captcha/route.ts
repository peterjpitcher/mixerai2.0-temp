import { NextRequest, NextResponse } from 'next/server';
import { withCSRF } from '@/lib/api/with-csrf';

type TurnstileSuccessResponse = {
  success: true;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

type TurnstileErrorResponse = {
  success: false;
  'error-codes'?: string[];
  action?: string;
};

type TurnstileVerifyResponse = TurnstileSuccessResponse | TurnstileErrorResponse;

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const runtime = 'nodejs';

export const POST = withCSRF(async (request: NextRequest) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error('[verify-captcha] TURNSTILE_SECRET_KEY is not configured.');
    return NextResponse.json(
      { success: false, error: 'CAPTCHA_NOT_CONFIGURED' },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'INVALID_REQUEST' },
      { status: 400 },
    );
  }

  const token = typeof (body as { token?: unknown })?.token === 'string' ? (body as { token: string }).token.trim() : null;
  const action = typeof (body as { action?: unknown })?.action === 'string' ? (body as { action: string }).action.trim() : undefined;

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'TOKEN_REQUIRED' },
      { status: 400 },
    );
  }

  const remoteIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined;

  const verificationPayload = new URLSearchParams();
  verificationPayload.append('secret', secret);
  verificationPayload.append('response', token);
  if (remoteIp) {
    verificationPayload.append('remoteip', remoteIp);
  }
  if (action) {
    verificationPayload.append('action', action);
  }

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    body: verificationPayload,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    console.error('[verify-captcha] Turnstile verification failed with status', response.status);
    return NextResponse.json(
      { success: false, error: 'CAPTCHA_UNAVAILABLE' },
      { status: 502 },
    );
  }

  const verification = (await response.json()) as TurnstileVerifyResponse;

  if (!verification.success) {
    const errors = verification['error-codes'] ?? [];
    console.warn('[verify-captcha] CAPTCHA validation failed', { errors, action: verification.action });
    return NextResponse.json(
      {
        success: false,
        error: 'CAPTCHA_FAILED',
        details: errors,
      },
      { status: 400 },
    );
  }

  if (action && verification.action && action !== verification.action) {
    console.warn('[verify-captcha] CAPTCHA action mismatch', {
      expected: action,
      received: verification.action,
    });
    return NextResponse.json(
      { success: false, error: 'CAPTCHA_ACTION_MISMATCH' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    hostname: verification.hostname,
    challengeTs: verification.challenge_ts,
    action: verification.action ?? action,
  });
});
