import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils'; // Import for consistent error handling

export const dynamic = "force-dynamic";

/**
 * GET: Test route to verify dynamic parameters.
 * NOTE: This route is likely for development/testing purposes only and should be considered for removal
 * or strict access control in production environments.
 * It is currently unauthenticated.
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
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
} 