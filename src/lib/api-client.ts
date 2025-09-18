/**
 * API Client with built-in CSRF protection, retry support, and typed errors.
 *
 * This module provides a fetch wrapper that automatically includes
 * CSRF tokens for state-changing operations, applies a guarded retry
 * strategy, and exposes helpers for working with JSON payloads and
 * strongly-typed failures.
 */

/**
 * Shape used when an API returns structured error content.
 */
export interface ApiErrorBody {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
  details?: unknown;
  hint?: string;
  [key: string]: unknown;
}

/**
 * Error raised by the API client when `throwOnHttpError` is enabled.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly body?: ApiErrorBody | string | null;
  public readonly response: Response;

  constructor(
    message: string,
    options: {
      status: number;
      statusText: string;
      code?: string;
      details?: unknown;
      body?: ApiErrorBody | string | null;
      response: Response;
    }
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.code = options.code;
    this.details = options.details;
    this.body = options.body;
    this.response = options.response;
  }
}

/**
 * Get CSRF token from cookies
 */
function getCSRFToken(): string | null {
  if (typeof document === 'undefined') return null;

  // Use regex to extract csrf-token from cookie string
  const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  if (csrfMatch && csrfMatch[1]) {
    return csrfMatch[1];
  }

  // Fallback: split and parse cookies manually
  const cookies = document.cookie.split(';');

  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    const [name, value] = trimmedCookie.split('=');

    if (name === 'csrf-token' && value) {
      return value;
    }
  }

  return null;
}

export interface ApiFetchInit extends RequestInit {
  /** Number of retry attempts for network/5xx failures. */
  retry?: number;
  /** Delay in milliseconds between retry attempts. Defaults to 300ms. */
  retryDelayMs?: number;
  /** Throw an `ApiClientError` automatically when the HTTP status is not OK. */
  throwOnHttpError?: boolean;
  /** Optional message to use when an error body does not provide one. */
  errorMessage?: string;
}

async function createClientError(
  response: Response,
  fallbackMessage?: string
): Promise<ApiClientError> {
  const clone = response.clone();
  let parsedBody: ApiErrorBody | string | null = null;
  let message = fallbackMessage || response.statusText || `Request failed with status ${response.status}`;
  let code: string | undefined;
  let details: unknown;

  try {
    const text = await clone.text();
    if (text) {
      try {
        const json = JSON.parse(text) as ApiErrorBody;
        parsedBody = json;
        message = json.error || json.message || message;
        code = typeof json.code === 'string' ? json.code : undefined;
        details = json.details;
      } catch {
        parsedBody = text;
        message = text;
      }
    }
  } catch {
    parsedBody = null;
  }

  return new ApiClientError(message, {
    status: response.status,
    statusText: response.statusText,
    code,
    details,
    body: parsedBody,
    response,
  });
}

/**
 * Enhanced fetch that automatically includes CSRF token for protected methods.
 *
 * Usage is identical to the native `fetch`, but with support for automatic
 * CSRF headers, optional retry behaviour, and structured error generation.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: ApiFetchInit
): Promise<Response> {
  const {
    retry = 0,
    retryDelayMs = 300,
    throwOnHttpError = false,
    errorMessage,
    ...requestInit
  } = init ?? {};

  const method = requestInit.method?.toUpperCase() || 'GET';
  const headers = new Headers(requestInit.headers);

  // Add CSRF token for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
  }

  // Ensure JSON content type for JSON bodies
  if (requestInit.body && typeof requestInit.body === 'string' && !headers.has('content-type')) {
    try {
      JSON.parse(requestInit.body);
      headers.set('content-type', 'application/json');
    } catch {
      // Not JSON, don't set content-type
    }
  }

  const normalizedRetry = Number.isFinite(retry) && retry > 0 ? Math.floor(retry) : 0;
  const delay = Number.isFinite(retryDelayMs) && retryDelayMs > 0 ? retryDelayMs : 300;

  const execute = async (attemptsRemaining: number): Promise<Response> => {
    try {
      const response = await fetch(input, {
        ...requestInit,
        headers,
        credentials: requestInit.credentials ?? 'include',
      });

      if (!response.ok && attemptsRemaining > 0 && response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return execute(attemptsRemaining - 1);
      }

      if (!response.ok && throwOnHttpError) {
        throw await createClientError(response, errorMessage);
      }

      return response;
    } catch (error) {
      if (attemptsRemaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return execute(attemptsRemaining - 1);
      }
      throw error;
    }
  };

  return execute(normalizedRetry);
}

/**
 * Safely parse a JSON response body. Returns `undefined` for empty bodies.
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T | undefined> {
  // Fast-path: No content
  if (response.status === 204) return undefined;

  const cloned = response.clone();
  const text = await cloned.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ApiClientError('Failed to parse JSON response', {
      status: response.status,
      statusText: response.statusText,
      response,
      body: text,
      details: error instanceof Error ? error.message : undefined,
    });
  }
}

/**
 * Fetch JSON and throw typed errors for unsuccessful status codes.
 */
export async function apiFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: ApiFetchInit
): Promise<T> {
  const response = await apiFetch(input, {
    ...init,
    throwOnHttpError: true,
  });

  const data = await parseJsonResponse<T>(response);
  return data as T;
}

/**
 * Convenience methods for common HTTP operations
 */
export const apiClient = {
  get: (url: string, options?: ApiFetchInit) =>
    apiFetch(url, { ...options, method: 'GET' }),

  post: (url: string, body?: unknown, options?: ApiFetchInit) =>
    apiFetch(url, {
      ...options,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),

  put: (url: string, body?: unknown, options?: ApiFetchInit) =>
    apiFetch(url, {
      ...options,
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),

  patch: (url: string, body?: unknown, options?: ApiFetchInit) =>
    apiFetch(url, {
      ...options,
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),

  delete: (url: string, options?: ApiFetchInit) =>
    apiFetch(url, { ...options, method: 'DELETE' }),
};
