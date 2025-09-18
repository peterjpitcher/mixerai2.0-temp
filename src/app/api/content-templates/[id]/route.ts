import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';
import { withAuthAndCSRF } from '@/lib/api/with-csrf';
import type { InputField, OutputField } from '@/types/template'; // Import field types
import { User } from '@supabase/supabase-js';
import { createApiErrorResponse } from '@/lib/api-error-handler';
import { OutputFieldSchema, InputFieldSchema } from '@/lib/schemas/template';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Helper interface for the structure of the 'fields' JSONB column
interface TemplateFieldsColumn {
  inputFields?: InputField[];
  outputFields?: OutputField[];
}

async function getAccessibleBrandIds(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_brand_permissions')
    .select('brand_id')
    .eq('user_id', userId);

  if (error) {
    console.error('[content-templates][id] Failed to load brand permissions:', error);
    throw new Error('Unable to verify brand permissions at this time.');
  }

  return (data || [])
    .map(record => record.brand_id)
    .filter((brandId): brandId is string => Boolean(brandId));
}

function isPlatformAdmin(user: User, accessibleBrandIds: string[]): boolean {
  return user.user_metadata?.role === 'admin' && accessibleBrandIds.length === 0;
}

/**
 * GET: Retrieve a specific content template by ID
 */
export const GET = withAuth(async (
  request: NextRequest,
  user: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    // Role check: Allow Admins (Platform/Scoped) and Editors to fetch a specific content template
    const userRole = user.user_metadata?.role;
    if (!(userRole === 'admin' || userRole === 'editor')) {
      return createApiErrorResponse(
        'You do not have permission to access this resource.',
        403 // Will be converted to 401 to avoid Vercel interception
      );
    }

    // console.log('API Route - GET template - Context:', context);
    const id = params.id;
    // console.log('API Route - Template ID from params:', id);
    
    if (!id) {
      // console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Fetch the template
    const { data: templateFromDb, error } = await supabase
      .from('content_templates')
      .select('*') // Fetches all columns, including the 'fields' JSONB column
      .eq('id', id)
      .single();
    
    if (error) {
      // console.error('API Route - Supabase error fetching template:', error);
      throw error;
    }
    
    if (!templateFromDb) {
      return NextResponse.json(
        { success: false, error: 'Content template not found' },
        { status: 404 }
      );
    }

    if (templateFromDb.brand_id) {
      const accessibleBrandIds = await getAccessibleBrandIds(supabase, user.id);
      const isGlobalAdmin = isPlatformAdmin(user, accessibleBrandIds);
      const hasBrandAccess = accessibleBrandIds.includes(templateFromDb.brand_id);

      if (!isGlobalAdmin && !hasBrandAccess) {
        return createApiErrorResponse(
          'You do not have permission to access this template.',
          403
        );
      }
    }
    
    // Transform the template structure for the response
    const { fields, ...restOfTemplate } = templateFromDb;
    // Cast fields to the specific type
    const typedFields = fields as TemplateFieldsColumn | null | undefined;
    
    // Parse fields through Zod schema to ensure proper defaults
    const inputFields = (typedFields?.inputFields || []).map(field => {
      try {
        return InputFieldSchema.parse(field);
      } catch {
        return field; // Fallback to original if parsing fails
      }
    });
    
    const outputFields = (typedFields?.outputFields || []).map(field => {
      try {
        return OutputFieldSchema.parse(field);
      } catch {
        return field; // Fallback to original if parsing fails
      }
    });
    
    const responseTemplate = {
      ...restOfTemplate,
      inputFields,
      outputFields
    };
    
    // console.log('API Route - Successfully fetched template:', responseTemplate?.id);
    return NextResponse.json({ 
      success: true, 
      template: responseTemplate // Send the transformed template
    });
  } catch (error) {
    // console.error('Error fetching content template:', error);
    return handleApiError(error, 'Failed to fetch content template');
  }
});

/**
 * PUT: Update a specific content template
 */
export const PUT = withAuthAndCSRF(async (
  request: NextRequest,
  user: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    // Role check: Only Global Admins can update content templates
    if (user.user_metadata?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to update this resource.' },
        { status: 403 }
      );
    }

    // console.log('API Route - PUT template - Context:', context);
    const id = params.id;
    // console.log('API Route - Template ID from params:', id);
    
    const data = await request.json();
    
    if (!id) {
      // console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    // The frontend (TemplateForm) now sends inputFields and outputFields as direct properties.
    // The database 'fields' column still expects a JSONB object: { inputFields: [], outputFields: [] }.
    // So, we need to reconstruct the 'fields' object for the database.
    if (!data.name || !data.inputFields || !data.outputFields) {
      return NextResponse.json(
        { success: false, error: 'Name, inputFields, and outputFields are required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();

    const { data: existingTemplate, error: fetchError } = await supabase
      .from('content_templates')
      .select('id, brand_id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!existingTemplate) {
      return NextResponse.json(
        { success: false, error: 'Content template not found.' },
        { status: 404 }
      );
    }

    const accessibleBrandIds = await getAccessibleBrandIds(supabase, user.id);
    const isGlobalAdmin = isPlatformAdmin(user, accessibleBrandIds);

    if (existingTemplate.brand_id && !isGlobalAdmin && !accessibleBrandIds.includes(existingTemplate.brand_id)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to modify this template.' },
        { status: 403 }
      );
    }
    
    let generatedDescription = data.description || '';
    const shouldRegenerateDescription = data.name !== undefined || data.inputFields !== undefined || data.outputFields !== undefined;

    if (shouldRegenerateDescription) {
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
        } else {
          // console.warn('Failed to generate AI description for template update.');
        }
      } catch {
        // console.warn('Error calling AI template description generation service on update:', aiError);
      }
    }

    // Reconstruct the 'fields' object for the database
    const fieldsForDb: TemplateFieldsColumn = {
      inputFields: data.inputFields || [],
      outputFields: data.outputFields || []
    };

    const updatePayload: Record<string, unknown> = {
      name: data.name,
      description: generatedDescription,
      icon: data.icon || null,
      fields: fieldsForDb, // Use the reconstructed fields object
      updated_at: new Date().toISOString()
    };

    if (data.brand_id !== undefined) {
      if (data.brand_id && !isGlobalAdmin && !accessibleBrandIds.includes(data.brand_id)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to assign this template to the selected brand.' },
          { status: 403 }
        );
      }
      updatePayload.brand_id = data.brand_id;
    }

    const { data: updatedTemplateFromDb, error } = await supabase
      .from('content_templates')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single(); // Assuming update + select single returns the object directly
    
    if (error) throw error;

    if (!updatedTemplateFromDb) {
      return NextResponse.json(
        { success: false, error: 'Template not found after update.' },
        { status: 404 } 
      );
    }
    
    // Transform the updated template for the response as well
    const { fields: updatedFieldsData, ...restOfUpdatedTemplate } = updatedTemplateFromDb;
    // Cast updatedFieldsData to the specific type
    const typedUpdatedFields = updatedFieldsData as TemplateFieldsColumn | null | undefined;
    
    // Parse fields through Zod schema to ensure proper defaults
    const parsedInputFields = (typedUpdatedFields?.inputFields || []).map(field => {
      try {
        return InputFieldSchema.parse(field);
      } catch {
        return field; // Fallback to original if parsing fails
      }
    });
    
    const parsedOutputFields = (typedUpdatedFields?.outputFields || []).map(field => {
      try {
        return OutputFieldSchema.parse(field);
      } catch {
        return field; // Fallback to original if parsing fails
      }
    });
    
    const responseUpdatedTemplate = {
      ...restOfUpdatedTemplate,
      inputFields: parsedInputFields,
      outputFields: parsedOutputFields
    };

    return NextResponse.json({
      success: true,
      template: responseUpdatedTemplate
    });
  } catch (error) {
    // console.error('Error updating content template:', error);
    return handleApiError(error, 'Failed to update content template');
  }
});

/**
 * DELETE: Remove a content template atomically using an RPC.
 */
export const DELETE = withAuthAndCSRF(async (
  request: NextRequest,
  user: User,
  context?: unknown
) => {
  const { params } = context as { params: { id: string } };
  try {
    // Role check: Only Global Admins can delete content templates
    if (user.user_metadata?.role !== 'admin') {
      return createApiErrorResponse(
        'You do not have permission to delete this resource.',
        403 // Will be converted to 401 to avoid Vercel interception
      );
    }

    const templateIdToDelete = params.id;
    // console.log('API Route - DELETE template - Template ID from params:', templateIdToDelete);
    
    if (!templateIdToDelete) {
      // console.error('API Route - Missing template ID in params');
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();

    const { data: templateRecord, error: templateError } = await supabase
      .from('content_templates')
      .select('id, brand_id')
      .eq('id', templateIdToDelete)
      .maybeSingle();

    if (templateError) {
      throw templateError;
    }

    if (!templateRecord) {
      return NextResponse.json(
        { success: false, error: 'Content template not found.' },
        { status: 404 }
      );
    }

    const accessibleBrandIds = await getAccessibleBrandIds(supabase, user.id);
    const isGlobalAdmin = isPlatformAdmin(user, accessibleBrandIds);

    if (templateRecord.brand_id && !isGlobalAdmin && !accessibleBrandIds.includes(templateRecord.brand_id)) {
      return createApiErrorResponse(
        'You do not have permission to delete this template.',
        403
      );
    }

    // Call the database function to perform atomic delete and content update
    const { error: rpcError } = await supabase.rpc('delete_template_and_update_content', {
      template_id_to_delete: templateIdToDelete
    });

    if (rpcError) {
      // console.error('Error calling delete_template_and_update_content RPC:', rpcError);
      // Check for specific PostgreSQL error codes if the function indicates template not found
      // This depends on how the function handles "not found" (e.g., raises an error or warning)
      // If it raises a specific error or a general one that we can identify:
      // if (rpcError.code === 'P0001' && rpcError.message.includes('Template not found')) { 
      //      return NextResponse.json({ success: false, error: 'Template not found or already deleted.' }, { status: 404 });
      // }
      throw rpcError; // Re-throw for generic handling by handleApiError
    }
    
    return NextResponse.json({
      success: true,
      message: 'Content template deleted successfully and associated content items have been updated.'
    });

  } catch (error) {
    // console.error('Error deleting content template:', error);
    // Ensure the error response structure is consistent if handleApiError is not already doing so
    const apiError = handleApiError(error, 'Failed to delete content template');
    // Check if apiError is already a NextResponse, if so return it, otherwise wrap it.
    // This depends on the implementation of handleApiError. For now, assume it returns a valid response.
    return apiError;
  }
}); 
