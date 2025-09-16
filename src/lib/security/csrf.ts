import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const CSRF_COOKIE = 'csrf_token';

export function issueCsrfToken(): string {
  const token = crypto.randomBytes(24).toString('base64url');
  cookies().set(CSRF_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  return token;
}

export function requireCsrf(req: Request) {
  const hdr = req.headers.get('x-csrf-token') || '';
  const cookie = cookies().get(CSRF_COOKIE)?.value || '';
  if (!hdr || !cookie || hdr !== cookie) {
    const err: any = new Error('Invalid CSRF token');
    err.status = 403;
    throw err;
  }
}

