import { NextResponse } from 'next/server';
import { withFileUploadValidation } from '@/lib/api/middleware/file-upload';
import { validateFile, validateFileContent } from '@/lib/validation/file-upload';

jest.mock('@/lib/validation/file-upload', () => {
  const actual = jest.requireActual('@/lib/validation/file-upload');
  return {
    ...actual,
    validateFile: jest.fn(actual.validateFile),
    validateFileContent: jest.fn(actual.validateFileContent),
  };
});

describe('withFileUploadValidation', () => {
  const mockHandler = jest.fn();
  const initHandler = (...args: Parameters<typeof withFileUploadValidation>) => withFileUploadValidation(...args);

const createRequest = (file?: File | null) => {
  const formData = new FormData();
  if (file) {
    formData.set('file', file);
  }

  return {
    formData: async () => formData,
  } as unknown as Request & { formData: () => Promise<FormData> };
};

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler.mockResolvedValue(NextResponse.json({ success: true }));
  });

  it('returns 400 when file is missing', async () => {
    const handler = initHandler(mockHandler, {});
    const request = createRequest(null);
    const response = await handler(request as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('FILE_MISSING');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('returns validation errors when validateFile fails', async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({
      valid: false,
      error: 'File type invalid',
      errors: ['File type invalid'],
    });

    const handler = initHandler(mockHandler, {});
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
    const request = createRequest(file);

    const response = await handler(request as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('FILE_INVALID');
    expect(body.details).toContain('File type invalid');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('returns content errors when validateFileContent fails', async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({ valid: true, errors: [] });
    (validateFileContent as jest.Mock).mockResolvedValueOnce({
      valid: false,
      error: 'SVG contains scripts',
      errors: ['SVG contains scripts'],
    });

    const handler = initHandler(mockHandler, { category: 'brandLogo' });
    const file = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    const request = createRequest(file);

    const response = await handler(request as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('FILE_CONTENT_INVALID');
    expect(body.details).toContain('SVG contains scripts');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('invokes downstream handler when validation passes', async () => {
    (validateFile as jest.Mock).mockReturnValueOnce({ valid: true, errors: [] });
    (validateFileContent as jest.Mock).mockResolvedValueOnce({ valid: true, errors: [] });

    mockHandler.mockResolvedValueOnce(NextResponse.json({ ok: true }));

    const handler = initHandler(mockHandler, {});
    const file = new File(['hello'], 'avatar.png', { type: 'image/png' });
    const request = createRequest(file);

    const response = await handler(request as any);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 500 when parsing form data throws', async () => {
    const handler = initHandler(mockHandler, {});
    const request = {
      formData: async () => {
        throw new Error('parse failure');
      },
    } as unknown as Request & { formData: () => Promise<FormData> };

    const response = await handler(request as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('FILE_UPLOAD_ERROR');
  });
});
