import { handleApiError, isBuildPhase } from '@/lib/api-utils';
import { NextResponse } from 'next/server';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      ...data,
      status: init?.status || 200,
      headers: init?.headers || {},
    })),
  },
}));

describe('API Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.CI;
    delete process.env.VERCEL;
    delete process.env.NEXT_PHASE;
  });

  describe('isBuildPhase', () => {
    it('should return true when CI environment variable is set', () => {
      process.env.CI = 'true';
      expect(isBuildPhase()).toBe(true);
    });

    it('should return true when VERCEL environment variable is set', () => {
      process.env.VERCEL = '1';
      expect(isBuildPhase()).toBe(true);
    });

    it('should return true when NEXT_PHASE is phase-production-build', () => {
      process.env.NEXT_PHASE = 'phase-production-build';
      expect(isBuildPhase()).toBe(true);
    });

    it('should return false when no build indicators are present', () => {
      expect(isBuildPhase()).toBe(false);
    });

    it('should return false for other NEXT_PHASE values', () => {
      process.env.NEXT_PHASE = 'phase-development-server';
      expect(isBuildPhase()).toBe(false);
    });
  });

  describe('handleApiError', () => {
    it('should handle Error objects correctly', () => {
      const error = new Error('Test error message');
      handleApiError(error, 'Custom message');

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Custom message',
          details: 'Test error message',
        },
        { status: 500 }
      );
    });

    it('should handle objects with message property', () => {
      const error = { message: 'Object error message' };
      handleApiError(error, 'API Error', 400);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'API Error',
          details: 'Object error message',
        },
        { status: 400 }
      );
    });

    it('should handle objects with error property', () => {
      const error = { error: 'Error property message' };
      handleApiError(error, 'API Error');

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'API Error',
          details: 'Error property message',
        },
        { status: 500 }
      );
    });

    it('should handle string errors', () => {
      const error = 'String error message';
      handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'An error occurred',
          details: 'String error message',
        },
        { status: 500 }
      );
    });

    it('should handle unknown error types', () => {
      const error = 12345;
      handleApiError(error, 'Unknown error');

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Unknown error',
          details: 'An unknown error occurred',
        },
        { status: 500 }
      );
    });

    it('should use default message when not provided', () => {
      const error = new Error('Test');
      handleApiError(error);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'An error occurred',
          details: 'Test',
        },
        { status: 500 }
      );
    });

    it('should handle null and undefined errors', () => {
      handleApiError(null, 'Null error');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Null error',
          details: 'An unknown error occurred',
        },
        { status: 500 }
      );

      handleApiError(undefined, 'Undefined error');
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Undefined error',
          details: 'An unknown error occurred',
        },
        { status: 500 }
      );
    });

    it('should respect custom status codes', () => {
      const error = new Error('Not found');
      handleApiError(error, 'Resource not found', 404);

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          error: 'Resource not found',
          details: 'Not found',
        },
        { status: 404 }
      );
    });
  });
});