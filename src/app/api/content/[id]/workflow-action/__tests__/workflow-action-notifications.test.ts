import { NextRequest } from 'next/server';
import { POST } from '../route';
import { createSupabaseAdminClient } from '@/lib/supabase/client';

jest.mock('@/lib/api/with-csrf', () => ({
  withAuthAndCSRF: (handler: unknown) => handler,
}));

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

describe('workflow-action notifications', () => {
  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues notifications for each assignee on rejection', async () => {
    const rpcMock = jest.fn().mockResolvedValue({ data: null, error: null });

    const contentUpdateMock = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }));

    const userTasksUpdateMock = jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
    }));

    const contentVersionInsertMock = jest.fn().mockResolvedValue({ error: null });

    const contentSelectMock = jest
      .fn()
      .mockImplementationOnce(() => ({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'content-1',
              status: 'pending_review',
              workflow_id: 'workflow-1',
              current_step: 'step-1',
              content_data: {},
              assigned_to: ['user-1', 'user-2'],
              brand_id: null,
              created_by: 'user-1',
              published_url: null,
            },
            error: null,
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              title: 'Quarterly Plan',
              brands: { name: 'Acme' },
            },
            error: null,
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              title: 'Quarterly Plan',
              created_by: 'user-1',
            },
            error: null,
          }),
        }),
      }));

    const workflowStepSelectMock = jest.fn(() => ({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'step-1',
            name: 'Review',
            step_order: 1,
            approval_required: false,
            assigned_user_ids: ['user-1', 'user-2'],
            form_requirements: null,
          },
          error: null,
        }),
      }),
    }));

    const contentVersionSelectMock = jest.fn(() => ({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    }));

    const supabaseStub = {
      from: jest.fn((table: string) => {
        if (table === 'content') {
          return {
            select: contentSelectMock,
            update: contentUpdateMock,
          };
        }
        if (table === 'workflow_steps') {
          return {
            select: workflowStepSelectMock,
          };
        }
        if (table === 'user_tasks') {
          return {
            update: userTasksUpdateMock,
          };
        }
        if (table === 'content_versions') {
          return {
            select: contentVersionSelectMock,
            insert: contentVersionInsertMock,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: rpcMock,
    };

    (createSupabaseAdminClient as jest.Mock).mockReturnValue(supabaseStub);

    const request = new NextRequest('http://localhost/api/content/content-1/workflow-action', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', feedback: 'Needs updates' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const response = await POST(request, { params: { id: 'content-1' } });

    expect(response.status).toBe(200);
    expect(contentUpdateMock).toHaveBeenCalledTimes(1);
    expect(userTasksUpdateMock).toHaveBeenCalledTimes(1);
    expect(contentVersionInsertMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenNthCalledWith(
      1,
      'enqueue_workflow_notification',
      expect.objectContaining({
        p_action: 'rejected',
        p_content_id: 'content-1',
        p_recipient_id: 'user-1',
      })
    );
    expect(rpcMock).toHaveBeenNthCalledWith(
      2,
      'enqueue_workflow_notification',
      expect.objectContaining({
        p_action: 'rejected',
        p_content_id: 'content-1',
        p_recipient_id: 'user-2',
      })
    );
  });
});
