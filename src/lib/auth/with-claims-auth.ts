import { withAuth } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';
import { validateCSRFToken } from '@/lib/csrf';

type Action = 'read'|'write'|'delete';

export const withClaimsAuth = (opts: { action: Action; requireBrandAccess?: boolean }) =>
  (handler: (req: Request, user: any, ctx?: any) => Promise<NextResponse>) =>
    withAuth(async (req: any, user: any, ctx?: any) => {
      try {
        const method = req.method?.toUpperCase?.() || 'GET';
        if (opts.action !== 'read' && !['GET','HEAD','OPTIONS'].includes(method)) {
          const ok = validateCSRFToken(req);
          if (!ok) {
            return NextResponse.json({ success: false, error: 'CSRF validation failed' }, { status: 403 });
          }
        }
        return handler(req, user, ctx);
      } catch (e: any) {
        const status = e?.status ?? 500;
        return NextResponse.json({ success: false, error: e?.message ?? 'Unauthorized' }, { status });
      }
    });

