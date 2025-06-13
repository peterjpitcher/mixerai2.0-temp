import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils'; // Import for consistent error handling
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth
import { User } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Mock templates for development environment or specific testing scenarios.
// This endpoint should be used with caution and potentially secured if accessible in staging/prod.
const mockTemplates = [
  {
    id: "mock-template-1",
    name: "Mock Blog Template",
    description: "A template for creating blog posts with introduction, body and conclusion",
    fields: {
      inputFields: [
        { id: "title", name: "Title", type: "shortText", required: true, options: {} },
        { id: "keywords", name: "Keywords", type: "tags", required: false, options: {} },
        { id: "topic", name: "Topic", type: "shortText", required: true, options: {} }
      ],
      outputFields: [
        { 
          id: "content", 
          name: "Blog Content", 
          type: "richText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write a blog post about {{topic}} using the keywords {{keywords}}"
        },
        { 
          id: "meta", 
          name: "Meta Description", 
          type: "plainText", 
          required: false, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write a meta description for a blog about {{topic}}"
        }
      ]
    },
    created_at: "2023-06-15T14:30:00Z",
    created_by: "00000000-0000-0000-0000-000000000000"
  },
  {
    id: "mock-template-2",
    name: "Mock Email Template",
    description: "A template for marketing emails with subject line and body",
    fields: {
      inputFields: [
        { id: "campaign", name: "Campaign Name", type: "shortText", required: true, options: {} },
        { id: "audience", name: "Target Audience", type: "shortText", required: true, options: {} }
      ],
      outputFields: [
        { 
          id: "subject", 
          name: "Email Subject", 
          type: "shortText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write an attention-grabbing email subject line for a {{campaign}} campaign targeting {{audience}}"
        },
        { 
          id: "body", 
          name: "Email Body", 
          type: "richText", 
          required: true, 
          options: {},
          aiAutoComplete: true,
          aiPrompt: "Write an engaging email body for a {{campaign}} campaign targeting {{audience}}"
        }
      ]
    },
    created_at: "2023-07-22T09:15:00Z",
    created_by: "00000000-0000-0000-0000-000000000000"
  }
];

/**
 * GET: Returns mock templates for testing. Admin-only access required.
 * This endpoint should be REMOVED or STRICTLY SECURED if kept in deployment.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAdminAuth(async (request: NextRequest, _user: User) => {
  // Console.log removed
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (id) {
      const template = mockTemplates.find(t => t.id === id);
      if (template) {
        return NextResponse.json({ 
          success: true, 
          template 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Template not found' 
        }, { status: 404 });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      templates: mockTemplates 
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching test templates');
  }
}); 