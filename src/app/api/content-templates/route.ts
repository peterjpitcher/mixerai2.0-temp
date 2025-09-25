import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import { z } from 'zod';
import { validateRequest, commonSchemas } from '@/lib/api/validation';
import { InputFieldSchema, OutputFieldSchema } from '@/lib/schemas/template';
import type { Json } from '@/types/supabase';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

type AuthenticatedUser = {
  id: string;
  user_metadata?: {
    role?: string;
  };
};

async function getAccessibleBrandIds(
  user: AuthenticatedUser,
  supabase: ReturnType<typeof createSupabaseAdminClient>
): Promise<string[]> {
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from('user_brand_permissions')
    .select('brand_id')
    .eq('user_id', user.id);

  if (error) {
    console.error('[content-templates] Failed to load brand permissions:', error);
    return [];
  }

  return (data || [])
    .map(record => record.brand_id)
    .filter((brandId): brandId is string => Boolean(brandId));
}

// Validation schema for creating a template
const createTemplateSchema = z.object({
  name: commonSchemas.nonEmptyString,
  description: z.string().optional(),
  icon: z.string().optional().nullable(),
  brand_id: commonSchemas.uuid.optional().nullable(),
  inputFields: z.array(InputFieldSchema).min(1, 'At least one input field is required'),
  outputFields: z.array(OutputFieldSchema).min(1, 'At least one output field is required')
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
export const GET = withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const userRole = user.user_metadata?.role;
    const isAdmin = userRole === 'admin';

    // Role check: Allow Admins (Platform/Scoped) and Editors to list/view content templates
    if (!(isAdmin || userRole === 'editor')) {
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

      if (!data) {
        return NextResponse.json({ success: false, error: 'Content template not found' }, { status: 404 });
      }

      if (!isAdmin && data.brand_id) {
        const accessibleBrands = await getAccessibleBrandIds(user, supabase);
        if (!accessibleBrands.includes(data.brand_id)) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: You do not have permission to access this template.' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        template: data
      });
    }
    
    // Otherwise, fetch all templates
    let query = supabase
      .from('content_templates')
      .select('*, content_count:content!template_id(count)')
      .order('name');

    if (!isAdmin) {
      const accessibleBrands = await getAccessibleBrandIds(user, supabase);
      if (accessibleBrands.length === 0) {
        query = query.is('brand_id', null);
      } else {
        const orFilters = ['brand_id.is.null', ...accessibleBrands.map(id => `brand_id.eq.${id}`)];
        query = query.or(orFilters.join(','));
      }
    }

    const { data: templatesData, error } = await query;
    
    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }

    const formattedTemplates = (templatesData || []).map(template => {
      const { content_count: rawCount, ...rest } = template as Record<string, unknown> & { content_count?: Array<{ count: number }> };
      const usageCount = Array.isArray(rawCount) && rawCount.length > 0 ? rawCount[0]?.count ?? 0 : 0;
      return { ...rest, usageCount };
    });

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
export const POST = withAuthAndCSRF(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    // Role check: Only Global Admins can create content templates
    if (user.user_metadata?.role !== 'admin') {
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

    const fieldsForDb = JSON.parse(JSON.stringify({
      inputFields: data.inputFields || [],
      outputFields: data.outputFields || []
    })) as Json;

    const { data: newTemplate, error } = await supabase
      .from('content_templates')
      .insert({
        name: data.name,
        description: generatedDescription,
        icon: data.icon || null,
        fields: fieldsForDb,
        brand_id: data.brand_id || null,
        created_by: user.id,
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
export const DELETE = withAuthAndCSRF(async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    // Role check: Only Global Admins can delete content templates
    if (user.user_metadata?.role !== 'admin') {
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
