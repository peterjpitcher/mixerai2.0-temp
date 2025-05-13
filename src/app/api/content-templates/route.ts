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
 * GET handler for templates, now wrapped with authentication.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const supabase = createSupabaseAdminClient();
    
    // If ID is provided, fetch a single template
    if (id) {
      const { data, error } = await supabase
        .from('content_templates')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        throw error;
      }
      
      return NextResponse.json({ 
        success: true, 
        template: data 
      });
    }
    
    // Otherwise, fetch all templates
    const { data: templatesData, error } = await supabase
      .from('content_templates')
      .select('*, content_count:content!template_id(count)')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    // Format data before sending
    const formattedTemplates = templatesData.map(template => ({
      ...template,
      // Supabase returns count as an array like [{ count: N }], so extract it.
      usageCount: template.content_count && Array.isArray(template.content_count) && template.content_count.length > 0 
                  ? template.content_count[0].count 
                  : 0,
      // Remove the raw content_count array from the response if desired
      content_count: undefined 
    }));

    return NextResponse.json({ 
      success: true, 
      templates: formattedTemplates
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch content templates');
  }
});

/**
 * POST: Create a new content template, withAuth applied directly.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
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

    // --- AI Description Generation for Template ---
    let generatedDescription = data.description || ''; // Use provided desc or generate
    try {
      const inputFieldNames = (data.fields.inputFields || []).map((f: any) => f.name).filter(Boolean);
      const outputFieldNames = (data.fields.outputFields || []).map((f: any) => f.name).filter(Boolean);

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const aiDescriptionResponse = await fetch(`${baseUrl}/api/ai/generate-template-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: data.name,
          inputFields: inputFieldNames,
          outputFields: outputFieldNames,
        }),
      });

      if (aiDescriptionResponse.ok) {
        const aiData = await aiDescriptionResponse.json();
        if (aiData.success && aiData.description) {
          generatedDescription = aiData.description;
        }
      } else {
        console.warn('Failed to generate AI description for template.');
      }
    } catch (aiError) {
      console.warn('Error calling AI template description generation service:', aiError);
    }
    // --- End AI Description Generation ---
    
    // Create the template in the database
    const supabase = createSupabaseAdminClient();
    const { data: template, error } = await supabase
      .from('content_templates')
      .insert({
        name: data.name,
        description: generatedDescription,
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
    return handleApiError(error, 'Failed to create content template');
  }
}); 