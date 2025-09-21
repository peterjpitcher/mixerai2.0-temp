import { apiClient, apiFetch, ApiClientError, parseJsonResponse } from '@/lib/api-client';

describe('api-client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    document.cookie = 'csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('reads the CSRF token from cookies when issuing a POST request', async () => {
    document.cookie = 'csrf-token=my%20token; path=/';

    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await apiFetch('/api/example', { method: 'POST' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('my token');
  });

  it('does not retry on deterministic ApiClientError responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(
      apiFetch('/api/example', { method: 'POST', retry: 3, throwOnHttpError: true })
    ).rejects.toBeInstanceOf(ApiClientError);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('passes FormData bodies through without JSON stringification', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['hello'], { type: 'text/plain' }), 'file.txt');

    (global.fetch as jest.Mock).mockResolvedValue(
      new Response(null, { status: 204 })
    );

    await apiClient.post('/api/upload', formData);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init?.body).toBe(formData);
    const headers = init?.headers as Headers;
    expect(headers.has('content-type')).toBe(false);
  });

  it('treats whitespace-only responses as empty when parsing JSON', async () => {
    const response = new Response('   ', { status: 200 });
    await expect(parseJsonResponse(response)).resolves.toBeUndefined();
  });
});
