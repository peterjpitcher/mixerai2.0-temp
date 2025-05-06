import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = "force-dynamic";

/**
 * POST endpoint to fix user role permissions
 * Body should contain:
 * - userId: string (required)
 * - role: 'admin' | 'editor' | 'viewer' (required)
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Check if the current user is an admin
    const supabase = createSupabaseAdminClient();
    const { data: isAdmin, error: adminCheckError } = await supabase
      .from('user_brand_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (adminCheckError) throw adminCheckError;
    
    // Only allow admins to fix roles
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only admin users can fix user roles' },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { userId, role } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    if (role !== 'admin' && role !== 'editor' && role !== 'viewer') {
      return NextResponse.json(
        { success: false, error: 'Role must be "admin", "editor", or "viewer"' },
        { status: 400 }
      );
    }
    
    // Check if the user exists
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get existing permissions for this user
    const { data: existingPermissions, error: permissionsError } = await supabase
      .from('user_brand_permissions')
      .select('*')
      .eq('user_id', userId);
    
    if (permissionsError) throw permissionsError;
    
    // Store the operations for detailed response with properly typed array
    const operations = {
      updated: 0,
      created: 0,
      details: [] as string[]
    };
    
    // If user has existing permissions, update them all to the new role
    if (existingPermissions && existingPermissions.length > 0) {
      for (const permission of existingPermissions) {
        const { error: updateError } = await supabase
          .from('user_brand_permissions')
          .update({ role })
          .eq('id', permission.id);
        
        if (updateError) throw updateError;
        operations.updated++;
        operations.details.push(`Updated permission ${permission.id} for brand ${permission.brand_id}`);
      }
    } else {
      // If user has no permissions, add one for each brand with the specified role
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id');
      
      if (brandsError) throw brandsError;
      
      for (const brand of brands) {
        const { data: newPermission, error: insertError } = await supabase
          .from('user_brand_permissions')
          .insert({
            user_id: userId,
            brand_id: brand.id,
            role
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        operations.created++;
        operations.details.push(`Created permission for brand ${brand.id}`);
      }
    }
    
    // Also update the user's metadata to reflect the new role
    const { error: metadataError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role
        }
      }
    );
    
    if (metadataError) throw metadataError;
    operations.details.push('Updated user metadata with new role');
    
    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      operations
    });
  } catch (error) {
    return handleApiError(error, 'Error fixing user role');
  }
}); 