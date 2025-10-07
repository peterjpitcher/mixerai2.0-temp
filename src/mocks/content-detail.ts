import type { VettingFeedbackStageResult } from '@/types/vetting-feedback';

const STAGE_ID = '1';

export const testTemplateMock = {
  id: 'template-123',
  name: 'Metadata Template',
  description: 'Template including metadata fields',
  inputFields: [] as unknown[],
  outputFields: [
    { id: 'meta_title', name: 'Meta Title', type: 'plainText' },
    { id: 'meta_description', name: 'Meta Description', type: 'plainText' },
  ],
};

export const testVettingFeedbackMock: Record<string, VettingFeedbackStageResult> = {
  [STAGE_ID]: {
    stageId: STAGE_ID,
    stageName: 'Initial Review',
    generatedAt: new Date('2024-07-01T12:05:00Z').toISOString(),
    generatedBy: 'system',
    items: [
      {
        id: 'feedback-1',
        priority: 'medium',
        agencyId: 'agency-1',
        agencyName: 'Quality Agency',
        summary: 'Metadata looks good overall.',
        recommendedAction: 'Monitor for keyword density.',
        relatedFields: ['meta_title', 'meta_description'],
      },
    ],
  },
};

export const testContentDetailMock = {
  id: 'playwright-content',
  title: 'Mock Article Title',
  body: '<p>This is rich body content.</p>',
  meta_title: 'Mock Meta Title',
  meta_description: 'Mock Meta Description',
  status: 'draft',
  brand_id: 'brand-123',
  brand_name: 'Test Brand',
  brand_color: '#3366ff',
  template_id: testTemplateMock.id,
  content_data: {
    generatedOutputs: {
      meta_title: {
        html: '',
        plain: 'Mock Meta Title Plain',
        wordCount: 4,
        charCount: 22,
      },
      meta_description: {
        html: '',
        plain: 'Mock Meta Description Plain Text',
        wordCount: 5,
        charCount: 33,
      },
    },
    vettingFeedback: testVettingFeedbackMock,
  },
  workflow: {
    id: 'workflow-1',
    name: 'Standard Review',
    steps: [
      {
        id: STAGE_ID,
        name: 'Initial Review',
        description: 'Ensure metadata follows guidelines.',
        assignees: [
          {
            id: 'user-1',
            full_name: 'Reviewer One',
            email: 'reviewer@example.com',
            avatar_url: null,
          },
        ],
        step_order: 1,
        approval_required: true,
        role: 'Reviewer',
        formRequirements: null,
        assigned_user_ids: ['user-1'],
      },
    ],
  },
  current_step: Number(STAGE_ID),
  workflow_id: 'workflow-1',
  versions: [
    {
      id: 'version-1',
      workflow_step_identifier: STAGE_ID,
      step_name: 'Initial Review',
      version_number: 1,
      action_status: 'pending_review',
      feedback: 'Looks solid so far.',
      reviewer: { id: 'user-1', full_name: 'Reviewer One', avatar_url: null },
      reviewer_id: 'user-1',
      created_at: '2024-07-01T12:00:00Z',
      content_json: {
        generatedOutputs: {
          meta_title: {
            html: '<p>Mock Meta Title Plain</p>',
            plain: 'Mock Meta Title Plain',
            wordCount: 4,
            charCount: 22,
          },
          meta_description: {
            html: '<p>Mock Meta Description Plain Text</p>',
            plain: 'Mock Meta Description Plain Text',
            wordCount: 5,
            charCount: 33,
          },
        },
      },
      content_id: 'playwright-content',
    },
  ],
  created_at: '2024-07-01T12:00:00Z',
  brands: {
    id: 'brand-123',
    name: 'Test Brand',
    brand_color: '#3366ff',
    logo_url: null,
    selected_vetting_agencies: [
      {
        id: 'agency-1',
        name: 'Quality Agency',
        description: 'Provides compliance insights.',
        priority: 'medium',
        country_code: 'US',
      },
    ],
  },
};

export const testBrandDetailMock = {
  success: true,
  brand: {
    id: testContentDetailMock.brand_id,
    name: 'Test Brand',
    brand_color: '#3366ff',
    logo_url: null,
    selected_vetting_agencies: testContentDetailMock.brands?.selected_vetting_agencies ?? [],
  },
};

export const testTemplateApiMock = {
  success: true,
  data: {
    ...testTemplateMock,
  },
};

export const testContentApiMock = {
  success: true,
  data: testContentDetailMock,
};

export const testSupabaseUser = {
  id: 'user-1',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
  email: 'reviewer@example.com',
  role: 'authenticated',
};
