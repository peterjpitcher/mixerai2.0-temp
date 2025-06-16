// import { createSupabaseAdminClient } from '@/lib/supabase/client';

interface TokenUsageData {
  userId: string;
  brandId?: string;
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  metadata?: Record<string, any>;
}

// Approximate costs per 1K tokens for different models (in USD)
const TOKEN_COSTS = {
  'gpt-4o': { prompt: 0.005, completion: 0.015 }, // $5 per 1M input, $15 per 1M output
  'gpt-4': { prompt: 0.03, completion: 0.06 },
  'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
  // Add more models as needed
};

export async function trackTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    // Calculate cost based on model
    const modelCosts = TOKEN_COSTS[data.model as keyof typeof TOKEN_COSTS] || TOKEN_COSTS['gpt-4o'];
    const promptCost = (data.promptTokens / 1000) * modelCosts.prompt;
    const completionCost = (data.completionTokens / 1000) * modelCosts.completion;
    const totalCost = promptCost + completionCost;
    
    // TODO: Uncomment when ai_token_usage table is created and types are generated
    // const supabase = createSupabaseAdminClient();
    // const { error } = await supabase
    //   .from('ai_token_usage')
    //   .insert({
    //     user_id: data.userId,
    //     brand_id: data.brandId,
    //     endpoint: data.endpoint,
    //     model: data.model,
    //     prompt_tokens: data.promptTokens,
    //     completion_tokens: data.completionTokens,
    //     total_tokens: data.totalTokens,
    //     cost_usd: totalCost,
    //     metadata: data.metadata || {}
    //   });
    
    // if (error) {
    //   console.error('Error tracking token usage:', error);
    // }
    
    // For now, just log the usage
    console.log('Token usage:', {
      userId: data.userId,
      endpoint: data.endpoint,
      tokens: data.totalTokens,
      cost: totalCost.toFixed(4)
    });
  } catch (error) {
    console.error('Failed to track token usage:', error);
    // Don't throw - we don't want to break the main flow if tracking fails
  }
}

export async function getUserTokenUsage(userId: string): Promise<{
  currentMonth: {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  };
  limit: number;
  resetDate: Date;
}> {
  try {
    // TODO: Uncomment when ai_token_usage table is created and types are generated
    // const supabase = createSupabaseAdminClient();
    
    // Get current month's start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Query current month's usage
    // const { data, error } = await supabase
    //   .from('ai_token_usage')
    //   .select('total_tokens, cost_usd')
    //   .eq('user_id', userId)
    //   .gte('created_at', monthStart.toISOString())
    //   .lt('created_at', monthEnd.toISOString());
    
    // if (error) {
    //   console.error('Error fetching token usage:', error);
    //   throw error;
    // }
    
    // Aggregate the data
    // const usage = data?.reduce((acc, record) => ({
    //   totalTokens: acc.totalTokens + (record.total_tokens || 0),
    //   totalCost: acc.totalCost + (Number(record.cost_usd) || 0),
    //   requestCount: acc.requestCount + 1
    // }), { totalTokens: 0, totalCost: 0, requestCount: 0 }) || { totalTokens: 0, totalCost: 0, requestCount: 0 };
    
    // For now, return mock data with some random variation
    const mockUsage = {
      totalTokens: Math.floor(Math.random() * 500000) + 100000,
      totalCost: Math.random() * 50 + 10,
      requestCount: Math.floor(Math.random() * 1000) + 100
    };
    
    // TODO: Get actual limits from user/organization settings
    // For now, use a default limit of 1M tokens per month
    const limit = 1000000;
    
    return {
      currentMonth: mockUsage,
      limit,
      resetDate: monthEnd
    };
  } catch (error) {
    console.error('Failed to get user token usage:', error);
    throw error;
  }
}

// Extract token counts from OpenAI API response
export function extractTokenCounts(response: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  // Handle different response formats
  if (response?.usage) {
    return {
      promptTokens: response.usage.prompt_tokens || 0,
      completionTokens: response.usage.completion_tokens || 0,
      totalTokens: response.usage.total_tokens || 0
    };
  }
  
  // For streaming responses or other formats
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
}