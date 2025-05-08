import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Mock templates for development environment
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
 * GET: Fetch all content templates
 */
export async function GET(request: NextRequest) {
  const isDevMode = process.env.NODE_ENV === 'development';
  console.log(`Content templates API - Development mode: ${isDevMode}`);
  
  if (isDevMode) {
    console.log('Development mode: Returning mock templates');
    
    // Get ID from query parameters
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // If ID is provided, return a single template
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
    
    // Otherwise return all templates
    return NextResponse.json({ 
      success: true, 
      templates: mockTemplates 
    });
  }
  
  // Production mode uses real authentication and database
  try {
    return await withAuth(async (req: NextRequest, user) => {
      try {
        const supabase = createSupabaseAdminClient();
        const url = new URL(req.url);
        const id = url.searchParams.get('id');
        
        // If ID is provided, fetch a single template
        if (id) {
          const { data, error } = await supabase
            .from('content_templates')
            .select('*')
            .eq('id', id)
            .single();
          
          if (error) throw error;
          
          return NextResponse.json({ 
            success: true, 
            template: data 
          });
        }
        
        // Otherwise, fetch all templates
        const { data: templates, error } = await supabase
          .from('content_templates')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        return NextResponse.json({ 
          success: true, 
          templates 
        });
      } catch (error) {
        console.error('Error fetching content templates:', error);
        return handleApiError(error, 'Failed to fetch content templates');
      }
    })(request);
  } catch (error) {
    console.error('Authentication error in content templates API:', error);
    
    // If we hit an authentication error in development, fall back to mock data
    if (isDevMode) {
      console.log('Development mode: Authentication failed, returning mock templates');
      return NextResponse.json({ 
        success: true, 
        templates: mockTemplates 
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

/**
 * POST: Create a new content template
 */
export async function POST(request: NextRequest) {
  const isDevMode = process.env.NODE_ENV === 'development';
  
  if (isDevMode) {
    console.log('Development mode: Creating mock template');
    
    try {
      const data = await request.json();
      
      // Validate required fields
      if (!data.name || !data.fields) {
        return NextResponse.json(
          { success: false, error: 'Name and fields are required' },
          { status: 400 }
        );
      }
      
      // Validate fields structure
      if (!data.fields.inputFields || !data.fields.outputFields) {
        return NextResponse.json(
          { success: false, error: 'Template must contain inputFields and outputFields' },
          { status: 400 }
        );
      }
      
      // Create a mock template with a new ID
      const newTemplate = {
        id: `mock-template-${Date.now()}`,
        name: data.name,
        description: data.description || '',
        icon: data.icon || null,
        fields: data.fields,
        created_by: "00000000-0000-0000-0000-000000000000",
        created_at: new Date().toISOString(),
      };
      
      console.log('Development mode: New template created (not saved to database):', newTemplate);
      
      return NextResponse.json({
        success: true,
        template: newTemplate
      });
    } catch (error) {
      console.error('Error creating content template:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to process request' },
        { status: 500 }
      );
    }
  }
  
  // Production mode uses real authentication and database
  try {
    return await withAuth(async (req: NextRequest, user) => {
      try {
        const data = await request.json();
        
        // Validate required fields
        if (!data.name || !data.fields) {
          return NextResponse.json(
            { success: false, error: 'Name and fields are required' },
            { status: 400 }
          );
        }
        
        // Validate fields structure
        if (!data.fields.inputFields || !data.fields.outputFields) {
          return NextResponse.json(
            { success: false, error: 'Template must contain inputFields and outputFields' },
            { status: 400 }
          );
        }
        
        const supabase = createSupabaseAdminClient();
        
        // Create new template
        const { data: newTemplate, error } = await supabase
          .from('content_templates')
          .insert({
            name: data.name,
            description: data.description || '',
            icon: data.icon || null,
            fields: data.fields,
            created_by: user.id
          })
          .select();
        
        if (error) throw error;
        
        return NextResponse.json({
          success: true,
          template: newTemplate[0]
        });
      } catch (error) {
        console.error('Error creating content template:', error);
        return handleApiError(error, 'Failed to create content template');
      }
    })(request);
  } catch (error) {
    console.error('Authentication error in content templates API:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 