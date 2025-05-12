import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils'; // Import for consistent error handling
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuth } from '@/lib/auth/api-auth'; // Use withAdminAuth

export const dynamic = "force-dynamic";

/**
 * GET: Test route to verify dynamic parameters. Admin-only access required.
 * NOTE: This route is for development/testing purposes only and should be REMOVED
 * or STRICTLY SECURED if kept in deployment.
 */
export const GET = withAdminAuth(async (request: NextRequest, user: any, context: { params: { id: string } }) => {
  try {
    const id = context?.params?.id;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test route for dynamic parameter ID was successful.',
      idReceived: id
    });
  } catch (error) {
    return handleApiError(error, 'Error in test dynamic parameter route');
  }
}); 