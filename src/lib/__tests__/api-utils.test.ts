jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    apiFetchJson: jest.fn(),
  };
});

jest.mock('@/lib/api/rls-helpers', () => ({
  isRLSError: jest.fn(),
}));

import {
  isProduction,
  isBuildPhase,
  isDatabaseConnectionError,
  handleApiError,
  fetchCountries,
  fetchProducts,
  fetchClaims,
} from '@/lib/api-utils';
import { apiFetchJson, ApiClientError } from '@/lib/api-client';
import { isRLSError } from '@/lib/api/rls-helpers';

const mockApiFetchJson = apiFetchJson as jest.MockedFunction<typeof apiFetchJson>;
const mockIsRLSError = isRLSError as jest.MockedFunction<typeof isRLSError>;

const originalEnv = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('environment helpers', () => {
  it('detects production via NEXT_PUBLIC_VERCEL_ENV', () => {
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'production';
    process.env.NODE_ENV = 'development';

    expect(isProduction()).toBe(true);
  });

  it('falls back to NODE_ENV for production detection', () => {
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    process.env.NODE_ENV = 'production';

    expect(isProduction()).toBe(true);
  });

  it('returns false when not in production', () => {
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    process.env.NODE_ENV = 'test';

    expect(isProduction()).toBe(false);
  });

  it('recognises the production build phase', () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    expect(isBuildPhase()).toBe(true);
  });

  it('recognises the export build phase', () => {
    process.env.NEXT_PHASE = 'phase-export';
    expect(isBuildPhase()).toBe(true);
  });

  it('returns false for non-build phases', () => {
    process.env.NEXT_PHASE = 'phase-development-server';
    expect(isBuildPhase()).toBe(false);
  });
});

describe('isDatabaseConnectionError', () => {
  it('matches known node connection error codes', () => {
    const error = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    expect(isDatabaseConnectionError(error)).toBe(true);
  });

  it('matches known postgres failure messages', () => {
    const error = new Error('Remaining connection slots are reserved for non-replication superuser connections');
    expect(isDatabaseConnectionError(error)).toBe(true);
  });

  it('ignores generic auth errors', () => {
    const error = new Error('Authentication token missing');
    expect(isDatabaseConnectionError(error)).toBe(false);
  });
});

describe('handleApiError', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
  });

  it('returns mock data during build phase', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    const response = handleApiError(new Error('database down'), 'Loading countries');

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ success: true, isMockData: true }));
  });

  it('maps RLS errors to 403 responses', async () => {
    mockIsRLSError.mockReturnValue(true);
    const response = handleApiError(new Error('RLS violation'), 'Fetch data');

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ success: false, code: 'PERMISSION_DENIED' }));
  });

  it('returns 503 for database connection failures', async () => {
    mockIsRLSError.mockReturnValue(false);
    const error = Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
    const response = handleApiError(error, 'Fetch data');

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual(expect.objectContaining({ success: false }));
  });
});

describe('data fetch helpers', () => {
  it('returns countries when API responds with countries array', async () => {
    mockApiFetchJson.mockResolvedValue({ success: true, countries: [{ code: 'US' }] as any });

    await expect(fetchCountries()).resolves.toEqual([{ code: 'US' }]);
  });

  it('returns empty array when countries request fails', async () => {
    mockApiFetchJson.mockRejectedValue(new Error('network'));

    await expect(fetchCountries()).resolves.toEqual([]);
  });

  it('returns products when API succeeds', async () => {
    mockApiFetchJson.mockResolvedValueOnce({ success: true, data: [{ id: 'prod' }] });

    await expect(fetchProducts()).resolves.toEqual([{ id: 'prod' }]);
  });

  it('returns empty array when products payload is not an array', async () => {
    mockApiFetchJson.mockResolvedValueOnce({ success: true, data: null as any });

    await expect(fetchProducts()).resolves.toEqual([]);
  });

  it('rejects missing product ID when fetching claims', async () => {
    await expect(fetchClaims('   ', 'US')).resolves.toEqual({ success: false, error: 'Product ID is required.', data: [] });
    expect(mockApiFetchJson).not.toHaveBeenCalled();
  });

  it('returns API response when claims fetch succeeds', async () => {
    mockApiFetchJson.mockResolvedValueOnce({ success: true, data: { claims: [] } });

    await expect(fetchClaims('product-1', 'US')).resolves.toEqual({ success: true, data: { claims: [] } });
  });

  it('falls back to empty data when API reports failure', async () => {
    mockApiFetchJson.mockResolvedValueOnce({ success: false, error: 'Failed', data: [{ id: '1' }] });

    await expect(fetchClaims('product-2', '')).resolves.toEqual({ success: false, error: 'Failed', data: [{ id: '1' }] });
  });

  it('maps ApiClientError 404 to friendly claims message', async () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' });
    const apiError = new ApiClientError('Not Found', {
      status: 404,
      statusText: 'Not Found',
      response,
      body: null,
    });

    mockApiFetchJson.mockRejectedValueOnce(apiError);

    await expect(fetchClaims('product-3', 'US')).resolves.toEqual({ success: false, error: 'Claims not found.', data: [] });
  });
});
