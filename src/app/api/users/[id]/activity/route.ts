import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api-utils';
import { withRouteAuth } from '@/lib/auth/route-handlers';
import { User } from '@supabase/supabase-js';

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// GET user activity log for the last 30 days
export const GET = withRouteAuth(async (_request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseServerClient();
    const isViewingOwnProfile = user.id === params.id;
    const isGlobalAdmin = user.user_metadata?.role === 'admin';

    // A user can view their own activity, or a global admin can view any user's activity
    if (!isViewingOwnProfile && !isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this user activity.' },
        { status: 403 }
      );
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch various activities for the user
    interface ActivityItem {
      type: string;
      action: string;
      description: string;
      timestamp: string;
      metadata: Record<string, unknown>;
    }
    const activities: ActivityItem[] = [];

    // Get content created/modified
    const { data: contentActivity } = await supabase
      .from('content')
      .select('id, title, created_at, updated_at, status')
      .or(`created_by.eq.${params.id},updated_by.eq.${params.id}`)
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(50);

    if (contentActivity) {
      contentActivity.forEach(content => {
        if (content.updated_at) {
          activities.push({
            type: 'content',
            action: content.created_at === content.updated_at ? 'created' : 'updated',
            description: `${content.created_at === content.updated_at ? 'Created' : 'Updated'} content: ${content.title || 'Untitled'}`,
            timestamp: content.updated_at,
            metadata: { 
              content_id: content.id,
              status: content.status 
            }
          });
        }
      });
    }

    // Note: Workflow history tracking would go here if the workflow_history table existed
    // For now, we'll skip this section

    // Get template activities
    const { data: templateActivity } = await supabase
      .from('content_templates')
      .select('id, name, created_at, updated_at')
      .or(`created_by.eq.${params.id},updated_by.eq.${params.id}`)
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(20);

    if (templateActivity) {
      templateActivity.forEach(template => {
        if (template.updated_at) {
          activities.push({
            type: 'template',
            action: template.created_at === template.updated_at ? 'created' : 'updated',
            description: `${template.created_at === template.updated_at ? 'Created' : 'Updated'} template: ${template.name}`,
            timestamp: template.updated_at,
            metadata: {
              template_id: template.id
            }
          });
        }
      });
    }

    // Note: Login activity would be tracked here if we had access to auth logs
    // For now, we'll skip this section

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Get activity summary stats
    const stats = {
      totalActivities: activities.length,
      contentCreated: activities.filter(a => a.type === 'content' && a.action === 'created').length,
      contentUpdated: activities.filter(a => a.type === 'content' && a.action === 'updated').length,
      templatesModified: activities.filter(a => a.type === 'template').length,
    };

    return NextResponse.json({
      success: true,
      activities: activities.slice(0, 100), // Limit to 100 most recent activities
      stats,
      period: {
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString()
      }
    });
  } catch (error) {
    return handleApiError(error, 'Error fetching user activity');
  }
});