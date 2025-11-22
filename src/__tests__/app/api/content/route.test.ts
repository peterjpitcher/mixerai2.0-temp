import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/content/route';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { sendNotificationEmail } from '@/lib/notifications/send-notification-email';
import { generateWorkflowDescription } from '@/lib/ai/generate-workflow-description';
import { generateContentTitleFromContext } from '@/lib/azure/openai';

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock('@/lib/api/with-csrf', () => ({
  withAuthAndCSRF: jest.fn((handler) => {
    return async (req: NextRequest, user: any, context?: any) => {
      return handler(req, user, context);
    };
  }),
}));

jest.mock('@/lib/notifications/send-notification-email', () => ({
  sendNotificationEmail: jest.fn(() => Promise.resolve({ success: true, message: 'Email sent', status: 200 })),
}));

jest.mock('@/lib/ai/generate-workflow-description', () => ({
  generateWorkflowDescription: jest.fn(() => Promise.resolve('Generated workflow description')),
}));

jest.mock('@/lib/azure/openai', () => ({
    generateContentTitleFromContext: jest.fn(() => Promise.resolve('Generated Content Title')),
}));

describe('POST /api/content', () => {
  let mockQb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup a shared QueryBuilder mock
    mockQb = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found', code: '404' } }),
    };

    // Configure the factory to return a client using our shared mockQb
    (createSupabaseAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => mockQb),
    });
  });

  const mockRequest = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers({
        'content-type': 'application/json',
        'authorization': 'Bearer token',
        'x-csrf-token': 'csrf-token',
      }),
    } as unknown as NextRequest;
  };

  it('should create content successfully with valid data and admin user', async () => {
    // Configure mocks in expected execution order
    
    // 1. workflow_steps check (maybeSingle) -> Found step
    mockQb.maybeSingle.mockResolvedValueOnce({ data: { id: 'step-1', assigned_user_ids: ['assignee-1'] }, error: null });

    // 2. brands check (single) -> Brand details
    mockQb.single.mockResolvedValueOnce({ data: { name: 'Test Brand', language: 'en', country: 'US' }, error: null });

    // 3. content insert (single) -> New content
    mockQb.single.mockResolvedValueOnce({ data: { id: 'new-content-id', brand_id: 'test-brand-id', title: 'Generated Content Title' }, error: null });

    // 4. user_tasks insert (single) -> New task (called inside loop for 1 assignee)
    mockQb.single.mockResolvedValueOnce({ data: { id: 'new-task-id' }, error: null });

    const requestBody = {
      brand_id: 'test-brand-id',
      body: 'This is some test content body.',
      template_id: 'test-template-id',
      workflow_id: 'test-workflow-id',
      status: 'draft',
      due_date: new Date().toISOString(),
    };
    const req = mockRequest(requestBody);

    const response = await POST(req, { id: 'test-user-id', email: 'test@example.com', user_metadata: { role: 'admin' } });

    expect(response.status).toBe(200);
    const jsonResponse = await response.json();
    expect(jsonResponse.success).toBe(true);
    expect(jsonResponse.data.id).toBe('new-content-id');
    expect(jsonResponse.data.title).toBe('Generated Content Title');
    expect(sendNotificationEmail).toHaveBeenCalledTimes(1);
    expect(generateContentTitleFromContext).toHaveBeenCalledTimes(1);
  });

  it('should return 400 if required fields are missing', async () => {
    const requestBody = {
      brand_id: 'test-brand-id',
      // body is missing
    };
    const req = mockRequest(requestBody);

    const response = await POST(req, { id: 'test-user-id', email: 'test@example.com', user_metadata: { role: 'admin' } });
    
    expect(response.status).toBe(400);
    const jsonResponse = await response.json();
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toContain('Missing required fields');
  });

  it('should return 403 if user lacks brand permissions', async () => {
    // 1. user_brand_permissions check (maybeSingle) -> No permission
    mockQb.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const requestBody = {
      brand_id: 'forbidden-brand-id',
      body: 'Content for forbidden brand.',
    };
    const req = mockRequest(requestBody);

    const response = await POST(req, { id: 'test-user-id', email: 'test@example.com', user_metadata: { role: 'editor' } }); // Not an admin
    
    expect(response.status).toBe(403);
    const jsonResponse = await response.json();
    expect(jsonResponse.success).toBe(false);
    expect(jsonResponse.error).toContain('You do not have permission to create content for this brand.');
  });

});