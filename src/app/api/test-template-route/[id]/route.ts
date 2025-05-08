import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic";

/**
 * GET: Test route to verify dynamic parameters
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    console.log('Test Route - Context:', context);
    const id = context?.params?.id;
    console.log('Test Route - ID from params:', id);
    
    if (!id) {
      console.error('Test Route - Missing ID in params');
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test route successful',
      id
    });
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 