import { NextRequest } from 'next/server';
import { POST } from '../route';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { generateTextCompletion } from '@/lib/azure/openai';

jest.mock('@/lib/api/with-csrf', () => ({
  withAuthAndCSRF: (handler: unknown) => handler,
}));

jest.mock('@/lib/supabase/client', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock('@/lib/azure/openai', () => ({
  generateTextCompletion: jest.fn(),
}));

describe('content regenerate validation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects regeneration when AI output is empty for required field', async () => {
    (generateTextCompletion as jest.Mock).mockResolvedValue('   ');

    const contentUpdateMock = jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ error: null }),
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

    const contentVersionInsertMock = jest.fn().mockResolvedValue({ error: null });

    const contentSelectMock = jest.fn(() => ({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'content-1',
            title: 'AI Draft',
            status: 'pending_review',
            workflow_id: 'workflow-1',
            current_step: 'step-1',
            assigned_to: ['user-1'],
            brand_id: 'brand-1',
            created_by: 'user-1',
            content_data: {},
            brands: {
              id: 'brand-1',
              name: 'Acme',
              brand_identity: 'Bold and helpful',
              tone_of_voice: 'Professional',
              guardrails: 'Stay on message',
            },
            content_templates: {
              id: 'template-1',
              name: 'Blog Post',
              fields: {
                inputFields: [],
                outputFields: [
                  {
                    id: 'field-1',
                    name: 'Main Body',
                    type: 'richText',
                    required: true,
                  },
                ],
              },
            },
          },
          error: null,
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
        if (table === 'content_versions') {
          return {
            select: contentVersionSelectMock,
            insert: contentVersionInsertMock,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      rpc: jest.fn(),
    };

    (createSupabaseAdminClient as jest.Mock).mockReturnValue(supabaseStub);

    const request = new NextRequest('http://localhost/api/content/content-1/regenerate', {
      method: 'POST',
      body: JSON.stringify({ fieldId: 'field-1', feedback: 'Tighten up copy' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    const response = await POST(request, { params: { id: 'content-1' } });

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ success: false });
    expect(contentUpdateMock).not.toHaveBeenCalled();
    expect(contentVersionInsertMock).toHaveBeenCalledTimes(1);
  });
});
