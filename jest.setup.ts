import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

// Provide fetch/request polyfills for tests that rely on Next.js Request objects
const nodeFetch = require('node-fetch');
if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = nodeFetch;
}
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = nodeFetch.Request;
}
if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = nodeFetch.Response;
}
if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = nodeFetch.Headers;
}

if (typeof globalThis.Response !== 'undefined' && typeof (globalThis.Response as any).json !== 'function') {
  const ResponseCtor = globalThis.Response as typeof Response;
  (ResponseCtor as any).json = function json(body: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return new ResponseCtor(JSON.stringify(body), {
      ...init,
      headers,
    });
  };
}

if (typeof (globalThis as any).NextResponse === 'undefined') {
  const responseJson = (body: unknown, init?: ResponseInit) => {
    return (globalThis.Response as typeof Response).json(body, init);
  };

  const responseRedirect = (url: string | URL, init?: number | ResponseInit) => {
    const status = typeof init === 'number' ? init : init?.status ?? 307;
    const headers = new Headers(typeof init === 'object' ? init.headers : undefined);
    headers.set('location', url.toString());
    return new Response(null, { status, headers });
  };

  const responseNext = () => new Response(null, { status: 200 });

  (globalThis as any).NextResponse = {
    json: responseJson,
    redirect: responseRedirect,
    next: responseNext,
  };
}
