import { NextResponse } from 'next/server';
import { activityTracker } from '@/lib/azure/activity-tracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = activityTracker.getStats();
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity stats' },
      { status: 500 }
    );
  }
}