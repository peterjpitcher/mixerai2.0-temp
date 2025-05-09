import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Mock templates for fallback in development
const mockTemplates = [
  {
    id: "mock-template-1",
    name: "Blog Post Template",
    description: "A standard blog post template with title, body, and metadata",
    fields: {
      inputFields: [
        {
          id: "title",
          name: "Title",
          type: "shortText",
          options: {
            maxLength: 100,
            minLength: 10,
          },
          required: true,
          aiSuggester: false,
        },
        {
          id: "keywords",
          name: "Keywords",
          type: "tags",
          options: {
            maxTags: 10,
          },
          aiPrompt: "Generate up to 10 keywords for an article with the title: {{title}}",
          required: true,
          aiSuggester: true,
        },
        {
          id: "brief",
          name: "Brief",
          type: "longText",
          options: {
            maxWords: 200,
            minWords: 50,
          },
          required: true,
          aiSuggester: false,
        },
      ],
      outputFields: [
        {
          id: "content",
          name: "Content",
          type: "richText",
          aiPrompt: "Generate an article with the title: {{title}}. Keywords: {{keywords}}. Brief: {{brief}}. The article should be around 800 words.",
          aiAutoComplete: true,
        },
        {
          id: "metaDescription",
          name: "Meta Description",
          type: "plainText",
          options: {
            maxLength: 160,
          },
          aiPrompt: "Generate a compelling meta description (max 160 characters) for an article with the title: {{title}}. Brief: {{brief}}",
          aiAutoComplete: true,
        },
      ],
    },
    created_by: null,
    created_at: "2024-05-08T12:25:11.313701+00:00",
    updated_at: "2024-05-08T12:25:11.313701+00:00",
  },
  {
    id: "mock-template-2",
    name: "Product Description Template",
    description: "A template for creating product descriptions",
    fields: {
      inputFields: [
        {
          id: "productName",
          name: "Product Name",
          type: "shortText",
          required: true,
          aiSuggester: false,
        },
        {
          id: "features",
          name: "Key Features",
          type: "tags",
          required: true,
          aiSuggester: false,
        },
      ],
      outputFields: [
        {
          id: "description",
          name: "Description",
          type: "richText",
          aiPrompt: "Generate a compelling product description for {{productName}} highlighting these key features: {{features}}.",
          aiAutoComplete: true,
        },
      ],
    },
    created_by: null,
    created_at: "2024-05-08T12:30:15.123456+00:00",
    updated_at: "2024-05-08T12:30:15.123456+00:00",
  },
];

/**
 * Direct GET handler for templates that bypasses auth in development mode
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const supabase = createSupabaseAdminClient();
    
    // If ID is provided, fetch a single template
    if (id) {
      console.log('Direct API Route - GET single template with ID:', id);
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching template:', error);
        throw error;
      }
      
      return NextResponse.json({ 
        success: true, 
        template: data 
      });
    }
    
    // Otherwise, fetch all templates
    console.log('Direct API Route - GET all templates');
    const { data: templates, error } = await supabase
      .from('content_templates')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      templates 
    });
  } catch (error) {
    console.error('Error in GET templates route:', error);
    
    // If database access fails, use mock data in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using mock template data');
      return NextResponse.json({ 
        success: true, 
        templates: mockTemplates,
        mock: true
      });
    }
    
    return handleApiError(error, 'Failed to fetch content templates');
  }
}

/**
 * POST: Create a new content template
 */
export async function POST(request: NextRequest) {
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
        
        // Create the template in the database
        const supabase = createSupabaseAdminClient();
        const { data: template, error } = await supabase
          .from('content_templates')
          .insert({
            name: data.name,
            description: data.description || '',
            fields: data.fields,
            created_by: user.id
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return NextResponse.json({
          success: true,
          template
        });
      } catch (error) {
        console.error('Error creating content template:', error);
        
        // If database access fails in development, create a mock template
        if (process.env.NODE_ENV === 'development') {
          try {
            // Get the request data again
            const data = await request.clone().json();
            
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
              template: newTemplate,
              mock: true
            });
          } catch (jsonError) {
            console.error('Error parsing request JSON in fallback:', jsonError);
            return NextResponse.json(
              { success: false, error: 'Invalid template data' },
              { status: 400 }
            );
          }
        }
        
        return handleApiError(error, 'Failed to create content template');
      }
    })(request);
  } catch (error) {
    console.error('Authentication error in create template API:', error);
    
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 401 }
    );
  }
} 