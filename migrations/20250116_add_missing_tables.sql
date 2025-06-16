--
-- Additional tables not in the initial dump
--

-- Create table for tracking AI token usage
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON ai_token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_id ON ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_brand_id ON ai_token_usage(brand_id);

-- Enable RLS
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own usage
CREATE POLICY "Users can view own token usage" ON ai_token_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS policy: Service role can insert usage records
CREATE POLICY "Service role can insert token usage" ON ai_token_usage
  FOR INSERT
  WITH CHECK (true);

-- Create a view for aggregated usage statistics
CREATE OR REPLACE VIEW ai_token_usage_stats AS
SELECT 
  user_id,
  DATE_TRUNC('month', created_at) as month,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost_usd,
  COUNT(*) as request_count
FROM ai_token_usage
GROUP BY user_id, DATE_TRUNC('month', created_at);

-- Grant permissions
GRANT SELECT ON ai_token_usage_stats TO authenticated;
GRANT INSERT ON ai_token_usage TO service_role;