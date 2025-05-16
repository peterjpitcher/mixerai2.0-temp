import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ENUM types - should be consistent with /api/feedback/route.ts
const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;
const feedbackStatuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const;

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];
type FeedbackStatus = typeof feedbackStatuses[number];

interface FeedbackUpdateBody {
  type?: FeedbackType;
  title?: string;
  description?: string;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  url?: string;
  browser_info?: string;
  os_info?: string;
  affected_area?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  app_version?: string;
  user_impact_details?: string;
  resolution_details?: string;
  // created_by should not be updatable, id is from params
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const feedbackId = params.id;

  if (!feedbackId) {
    return NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('feedback_items')
    .select(`
      *,
      created_by_profile:profiles (
        full_name,
        avatar_url
      ),
      assigned_to_profile:profiles (
        full_name,
        avatar_url
      )
    `)
    .eq('id', feedbackId)
    .single();

  if (error) {
    console.error(`Error fetching feedback item ${feedbackId}:`, error);
    if (error.code === 'PGRST116') { // PostgREST error for "exactly one row" not found
        return NextResponse.json({ success: false, error: 'Feedback item not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback item', details: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: 'Feedback item not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServerClient();
  const feedbackId = params.id;

  if (!feedbackId) {
    return NextResponse.json({ success: false, error: 'Feedback ID is required' }, { status: 400 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
  }

  let body: FeedbackUpdateBody;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate ENUM fields if present in the body
  if (body.type && !feedbackTypes.includes(body.type)) {
    return NextResponse.json({ success: false, error: 'Invalid field: type' }, { status: 400 });
  }
  if (body.priority && !feedbackPriorities.includes(body.priority)) {
    return NextResponse.json({ success: false, error: 'Invalid field: priority' }, { status: 400 });
  }
  if (body.status && !feedbackStatuses.includes(body.status)) {
    return NextResponse.json({ success: false, error: 'Invalid field: status' }, { status: 400 });
  }
  
  const { ...updateData } = body;
  if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No update data provided' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('feedback_items')
    .update(updateData)
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating feedback item ${feedbackId}:`, error);
    if (error.code === 'PGRST116') { // Not found
        return NextResponse.json({ success: false, error: 'Feedback item not found for update' }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: 'Failed to update feedback item', details: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: 'Feedback item not found after update attempt' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
} 