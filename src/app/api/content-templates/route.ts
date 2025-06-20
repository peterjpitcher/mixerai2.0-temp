import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/api/validation';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Field schema for template fields
const templateFieldSchema = z.object({
  id: commonSchemas.nonEmptyString,
  name: commonSchemas.nonEmptyString,
  type: z.enum(['shortText', 'longText', 'richText', 'plainText', 'tags', 'email', 'url', 'number', 'date']),
  options: z.record(z.any()).optional(),
  required: z.boolean().optional(),
  aiSuggester: z.boolean().optional(),
  aiPrompt: z.string().optional(),
  aiAutoComplete: z.boolean().optional()
});

// Validation schema for creating a template
const createTemplateSchema = z.object({
  name: commonSchemas.nonEmptyString,
  description: z.string().optional(),
  icon: z.string().optional().nullable(),
  brand_id: commonSchemas.uuid.optional().nullable(),
  inputFields: z.array(templateFieldSchema).min(1, 'At least one input field is required'),
  outputFields: z.array(templateFieldSchema).min(1, 'At least one output field is required')
});

// Mock templates for fallback in development
/* 
const _mockTemplates = [
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
*/

/**
 * GET handler for templates, now wrapped with authentication.
 */
export const GET = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    // Role check: Allow Admins (Platform/Scoped) and Editors to list/view content templates
    if (!((user as { user_metadata?: { role?: string } }).user_metadata?.role === 'admin' || (user as { user_metadata?: { role?: string } }).user_metadata?.role === 'editor')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to access this resource.' },
        { status: 403 }
      );
    }

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
export const POST = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    // Role check: Only Global Admins can create content templates
    if ((user as { user_metadata?: { role?: string } }).user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create this resource.' },
        { status: 403 }
      );
    }

    // Validate request body
    const validation = await validateRequest(request, createTemplateSchema);
    if (!validation.success) {
      return validation.response;
    }
    
    const data = validation.data;
    
    const supabase = createSupabaseAdminClient();
    
    let generatedDescription = data.description || '';
    try {
      const inputFieldNames = (data.inputFields || []).map((f: Record<string, unknown>) => f.name).filter(Boolean);
      const outputFieldNames = (data.outputFields || []).map((f: Record<string, unknown>) => f.name).filter(Boolean);

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
      }
    } catch {
      // console.warn('Error calling AI template description generation service:', aiError);
    }

    // Reconstruct the 'fields' object for the database
    const fieldsForDb = {
      inputFields: data.inputFields || [],
      outputFields: data.outputFields || []
    };

    const { data: newTemplate, error } = await supabase
      .from('content_templates')
      .insert({
        name: data.name,
        description: generatedDescription,
        icon: data.icon || null,
        fields: fieldsForDb, // Use the reconstructed fields object
        brand_id: data.brand_id || null,
        created_by: (user as { id: string }).id,
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      template: newTemplate
    });
  } catch (error) {
    return handleApiError(error, 'Failed to create content template');
  }
});

/**
 * DELETE: Delete a content template, withAuth applied directly.
 */
export const DELETE = withAuth(async (request: NextRequest, user: unknown) => {
  try {
    // Role check: Only Global Admins can delete content templates
    if ((user as { user_metadata?: { role?: string } }).user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to delete this resource.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const supabase = createSupabaseAdminClient();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // Optional: Check if template exists before attempting to delete
    // This is good practice but adds an extra DB call.
    // For now, we'll rely on the delete operation itself.

    const { error: deleteError } = await supabase
      .from('content_templates')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      // console.error('Error deleting template:', deleteError);
      throw deleteError;
    }
    
    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    // console.error('Error in DELETE /api/content-templates:', error);
    return handleApiError(error, 'Failed to delete content template');
  }
}); 