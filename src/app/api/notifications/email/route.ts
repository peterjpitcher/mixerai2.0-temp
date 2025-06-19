import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { handleApiError } from '@/lib/api-utils';
import { sendEmail } from '@/lib/email/resend';
import { taskAssignmentTemplate, workflowActionTemplate, deadlineReminderTemplate } from '@/lib/email/templates';
import { format } from 'date-fns';

export const dynamic = "force-dynamic";

interface EmailNotificationRequest {
  type: 'task_assignment' | 'workflow_action' | 'deadline_reminder';
  userId?: string;
  contentId?: string;
  taskId?: string;
  action?: 'approved' | 'rejected';
  feedback?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailNotificationRequest = await request.json();
    
    // Validate request
    if (!body.type) {
      return NextResponse.json(
        { success: false, error: 'Notification type is required' },
        { status: 400 }
      );
    }
    
    const supabase = createSupabaseAdminClient();
    
    // Get user details
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    if (body.userId) {
      const { data: userData } = await supabase.auth.admin.getUserById(body.userId);
      if (userData?.user) {
        userEmail = userData.user.email || null;
        userName = userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'User';
      }
    }
    
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email not found' },
        { status: 400 }
      );
    }
    
    // TODO: Add email preference checks once email_notifications_enabled and email_preferences columns are added to profiles table
    // For now, send all emails
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mixerai.com';
    
    switch (body.type) {
      case 'task_assignment': {
        if (!body.taskId) {
          return NextResponse.json(
            { success: false, error: 'Task ID required for task assignment' },
            { status: 400 }
          );
        }
        
        // Get task details
        const { data: task } = await supabase
          .from('user_tasks')
          .select(`
            *,
            content (
              title,
              brands (name),
              workflow_steps!current_step (name)
            )
          `)
          .eq('id', body.taskId)
          .single();
          
        if (!task || !task.content) {
          return NextResponse.json(
            { success: false, error: 'Task or content not found' },
            { status: 404 }
          );
        }
        
        const emailData = taskAssignmentTemplate({
          userName: userName || 'User',
          appUrl,
          taskTitle: 'Review Content',
          contentTitle: task.content.title,
          brandName: task.content.brands?.name || 'Unknown Brand',
          workflowStep: task.content.workflow_steps?.name || 'Unknown Step',
          dueDate: task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : undefined
        });
        
        await sendEmail({
          to: userEmail,
          ...emailData
        });
        
        break;
      }
      
      case 'workflow_action': {
        if (!body.contentId || !body.action) {
          return NextResponse.json(
            { success: false, error: 'Content ID and action required for workflow action' },
            { status: 400 }
          );
        }
        
        // Get content and creator details
        const { data: content } = await supabase
          .from('content')
          .select(`
            title,
            created_by,
            brands (name),
            workflow_steps!current_step (name)
          `)
          .eq('id', body.contentId)
          .single();
          
        if (!content) {
          return NextResponse.json(
            { success: false, error: 'Content not found' },
            { status: 404 }
          );
        }
        
        // Get creator details
        if (!content.created_by) {
          return NextResponse.json(
            { success: false, error: 'Content creator not found' },
            { status: 404 }
          );
        }
        const { data: creatorData } = await supabase.auth.admin.getUserById(content.created_by);
        if (!creatorData?.user?.email) {
          return NextResponse.json(
            { success: false, error: 'Content creator not found' },
            { status: 404 }
          );
        }
        
        const creatorName = creatorData.user.user_metadata?.full_name || creatorData.user.email.split('@')[0];
        
        const emailData = workflowActionTemplate({
          userName: creatorName,
          appUrl,
          contentTitle: content.title,
          brandName: content.brands?.name || 'Unknown Brand',
          action: body.action,
          feedback: body.feedback,
          reviewerName: userName || 'Reviewer',
          nextStep: body.action === 'approved' ? content.workflow_steps?.name : undefined
        });
        
        await sendEmail({
          to: creatorData.user.email,
          ...emailData
        });
        
        break;
      }
      
      case 'deadline_reminder': {
        if (!body.contentId) {
          return NextResponse.json(
            { success: false, error: 'Content ID required for deadline reminder' },
            { status: 400 }
          );
        }
        
        // Get content details
        const { data: content } = await supabase
          .from('content')
          .select(`
            title,
            brands (name),
            workflow_steps!current_step (name)
          `)
          .eq('id', body.contentId)
          .single();
          
        if (!content) {
          return NextResponse.json(
            { success: false, error: 'Content not found' },
            { status: 404 }
          );
        }
        
        // TODO: Add due date support once due_date column is added to content table
        return NextResponse.json(
          { success: false, error: 'Due date reminders not yet supported' },
          { status: 501 }
        );
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid notification type' },
          { status: 400 }
        );
    }
    
    // Log notification sent
    await supabase
      .from('notifications')
      .insert({
        user_id: body.userId,
        title: `Email sent: ${body.type.replace('_', ' ')}`,
        message: `Email notification sent to ${userEmail}`,
        type: 'email',
        metadata: { 
          notificationType: body.type,
          contentId: body.contentId,
          taskId: body.taskId
        }
      });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Email notification sent successfully' 
    });
    
  } catch (error) {
    console.error('Email notification error:', error);
    return handleApiError(error, 'Failed to send email notification');
  }
}