import { NextResponse } from 'next/server';
import { withAuthAndMonitoring } from '@/lib/auth/api-auth';
import { getUserTokenUsage } from '@/lib/azure/token-tracking';

export const dynamic = 'force-dynamic';

export const GET = withAuthAndMonitoring(async (request, user) => {
  try {
    const usage = await getUserTokenUsage(user.id);
    
    return NextResponse.json({
      success: true,
      usage: {
        tokens_used: usage.currentMonth.totalTokens,
        tokens_limit: usage.limit,
        period: 'monthly',
        reset_date: usage.resetDate.toISOString(),
        cost_usd: usage.currentMonth.totalCost,
        request_count: usage.currentMonth.requestCount
      }
    });
  } catch (error) {
    console.error('Error fetching AI usage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
});