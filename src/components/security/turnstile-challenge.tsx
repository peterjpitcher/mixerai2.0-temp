'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo } from 'react';

const Turnstile = dynamic(() => import('react-turnstile'), { ssr: false });

export interface TurnstileChallengeProps {
  action: 'login' | 'password_reset';
  onTokenChange: (token: string | null) => void;
  resetCounter?: number;
  disabled?: boolean;
  className?: string;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Wrapper around Cloudflare Turnstile that gracefully no-ops when a site key
 * is not configured. This allows development environments to run without the
 * CAPTCHA while still enforcing it in production.
 */
export function TurnstileChallenge({
  action,
  onTokenChange,
  resetCounter = 0,
  disabled = false,
  className,
}: TurnstileChallengeProps) {
  useEffect(() => {
    if (!SITE_KEY) {
      console.warn('[TurnstileChallenge] NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured. CAPTCHA is disabled.');
    }
  }, []);

  useEffect(() => {
    if (disabled) {
      onTokenChange(null);
    }
  }, [disabled, onTokenChange]);

  const widgetKey = useMemo(() => `${action}-${resetCounter}`, [action, resetCounter]);

  if (!SITE_KEY) {
    return null;
  }

  return (
    <div className={className}>
      <Turnstile
        key={widgetKey}
        sitekey={SITE_KEY}
        action={action}
        appearance="interaction-only"
        refreshExpired="auto"
        onVerify={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
      />
    </div>
  );
}
