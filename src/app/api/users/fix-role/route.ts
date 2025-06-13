import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth for global admin check
import { User } from '@supabase/supabase-js';

export const dynamic = "force-dynamic";

/**
 * POST endpoint to fix user role permissions across all their associated brands.
 * Also updates the user's global role in metadata.
 * Body should contain:
 * - userId: string (required)
 * - role: 'admin' | 'editor' | 'viewer' (required)
 * REQUIRES GLOBAL ADMIN PRIVILEGES.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAdminAuth(async (request: NextRequest, _adminUser: User) => {
  try {
    // adminUser is the authenticated global admin from withAdminAuth
    const supabase = createSupabaseAdminClient();
    
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
    
    // If user has existing permissions, update them all to the new role using RPC
    if (existingPermissions && existingPermissions.length > 0) {
      const { data: updatedCount, error: rpcError } = await supabase.rpc(
        'set_user_role_for_all_assigned_brands', // TODO: Regenerate types
        {
          target_user_id: userId,
          new_role: role
        }
      );

      if (rpcError) {
        console.error('RPC Error updating user roles:', rpcError);
        throw new Error(`Failed to update user roles: ${rpcError.message}`);
      }

      operations.updated = updatedCount || 0;
      operations.details.push(`Atomically updated ${updatedCount || 0} existing brand permissions to role '${role}'.`);
      
      // REMOVED LOOP FOR INDIVIDUAL UPDATES
      // for (const permission of existingPermissions) {
      //   const { error: updateError } = await supabase
      //     .from('user_brand_permissions')
      //     .update({ role })
      //     .eq('id', permission.id);
        
      //   if (updateError) throw updateError;
      //   operations.updated++;
      //   operations.details.push(`Updated permission ${permission.id} for brand ${permission.brand_id}`);
      // }
    } else {
      // If user has no existing permissions, just log this fact.
      // We will still update the metadata role.
      operations.details.push('User has no existing brand permissions to update.');
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