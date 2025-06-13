import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic'; // Ensure dynamic handling for auth

// Define ENUM types matching the database
// Ideally, these would be imported from your generated Supabase types if available
// e.g., import { Database } from '@/types/supabase';
// type FeedbackType = Database['public']['Enums']['feedback_type'];
// type FeedbackPriority = Database['public']['Enums']['feedback_priority'];
// type FeedbackStatus = Database['public']['Enums']['feedback_status'];

const feedbackTypes = ['bug', 'enhancement'] as const;
const feedbackPriorities = ['low', 'medium', 'high', 'critical'] as const;
const feedbackStatuses = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'] as const;

type FeedbackType = typeof feedbackTypes[number];
type FeedbackPriority = typeof feedbackPriorities[number];
type FeedbackStatus = typeof feedbackStatuses[number];

interface FeedbackPostBody {
  type: FeedbackType; // Use specific ENUM type
  title?: string;
  description?: string;
  priority: FeedbackPriority; // Use specific ENUM type
  status?: FeedbackStatus; // Use specific ENUM type, defaults to 'open' in DB
  affected_area?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  app_version?: string;
  user_impact_details?: string;
  // attachments_metadata could be added later if file uploads are implemented
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user:', userError);
    return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 });
  }

  let body: FeedbackPostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.type || !feedbackTypes.includes(body.type)) {
    return NextResponse.json({ success: false, error: 'Invalid or missing field: type' }, { status: 400 });
  }
  if (!body.priority || !feedbackPriorities.includes(body.priority)) {
    return NextResponse.json({ success: false, error: 'Invalid or missing field: priority' }, { status: 400 });
  }
  if (body.status && !feedbackStatuses.includes(body.status)) {
    return NextResponse.json({ success: false, error: 'Invalid field: status' }, { status: 400 });
  }

  const feedbackData: {
    type: FeedbackType;
    title?: string;
    description?: string;
    priority: FeedbackPriority;
    status?: FeedbackStatus;
    affected_area?: string;
    steps_to_reproduce?: string;
    expected_behavior?: string;
    actual_behavior?: string;
    app_version?: string;
    user_impact_details?: string;
    created_by: string;
  } = {
    ...body,
    type: body.type,
    priority: body.priority,
    created_by: user.id,
  };

  if (body.status) {
    feedbackData.status = body.status;
  } else {
    feedbackData.status = 'open';
  }
  
  const { data, error } = await supabase
    .from('feedback_items')
    .insert([feedbackData])
    .select()
    .single();

  if (error) {
    console.error('Error inserting feedback:', error);
    return NextResponse.json({ success: false, error: 'Failed to create feedback item', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function GET(request: Request) {
  // const cookieStore = cookies(); // Not needed as createSupabaseServerClient calls cookies() internally
  const supabase = createSupabaseServerClient(); // Corrected: No argument needed
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    // Allow anonymous access or specific error for GET if desired, but for now, require auth
    return NextResponse.json({ success: false, error: 'User not authenticated to view feedback' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const typeParam = searchParams.get('type');
  const statusParam = searchParams.get('status');
  const priorityParam = searchParams.get('priority');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('feedback_items')
    .select('*, created_by_profile:profiles!fk_feedback_created_by(full_name, avatar_url)', { count: 'exact' }); // Fetch creator profile info

  if (typeParam && feedbackTypes.includes(typeParam as FeedbackType)) {
    query = query.eq('type', typeParam as FeedbackType);
  }
  if (statusParam && feedbackStatuses.includes(statusParam as FeedbackStatus)) {
    query = query.eq('status', statusParam as FeedbackStatus);
  }
  if (priorityParam && feedbackPriorities.includes(priorityParam as FeedbackPriority)) {
    query = query.eq('priority', priorityParam as FeedbackPriority);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching feedback items:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback items', details: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
      totalItems: count,
      itemsPerPage: limit,
    },
  });
} 