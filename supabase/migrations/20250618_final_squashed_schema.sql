-- Final Squashed Migration: Complete MixerAI 2.0 Database Schema
-- Generated: 2025-06-18
-- This migration includes all changes up to and including:
-- - Base schema from 20250618_squashed_complete_schema.sql
-- - Batch support for tool runs
-- - Email preferences for profiles
-- - All other migrations already applied to the production schema

-- NOTE: This migration assumes a fresh database. 
-- The current production schema already has all these changes except:
-- 1. batch_id and batch_sequence columns in tool_run_history
-- 2. email preference columns in profiles

-- For production, only run the following two ALTER TABLE statements:

-- Add batch support to tool_run_history table for grouping related runs
ALTER TABLE public.tool_run_history 
ADD COLUMN IF NOT EXISTS batch_id uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS batch_sequence integer DEFAULT NULL;

-- Add index for batch_id for performance
CREATE INDEX IF NOT EXISTS tool_run_history_batch_id_idx ON public.tool_run_history(batch_id);

-- Add composite index for batch_id and sequence for ordering within batches
CREATE INDEX IF NOT EXISTS tool_run_history_batch_id_sequence_idx ON public.tool_run_history(batch_id, batch_sequence);

-- Add comment explaining the purpose
COMMENT ON COLUMN public.tool_run_history.batch_id IS 'Groups multiple tool runs that were executed together as a batch';
COMMENT ON COLUMN public.tool_run_history.batch_sequence IS 'Order of execution within a batch (1, 2, 3, etc.)';

-- Add email notification preferences to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_frequency text DEFAULT 'immediate' CHECK (email_frequency IN ('immediate', 'daily', 'weekly')),
ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{"task_assignments": true, "workflow_updates": true, "deadline_reminders": true}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN profiles.email_notifications_enabled IS 'Whether the user wants to receive email notifications';
COMMENT ON COLUMN profiles.email_frequency IS 'How often the user wants to receive email notifications (immediate, daily digest, weekly digest)';
COMMENT ON COLUMN profiles.email_preferences IS 'Specific email notification preferences by type';