import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  timestamp: string;
}

export const ok = <T>(data: T, pagination?: ApiResponse['pagination']) =>
  NextResponse.json<ApiResponse<T>>({ success: true, data, pagination, timestamp: new Date().toISOString() });

export const fail = (status: number, error: string, details?: string) =>
  NextResponse.json<ApiResponse>({ success: false, error, details, timestamp: new Date().toISOString() }, { status });
