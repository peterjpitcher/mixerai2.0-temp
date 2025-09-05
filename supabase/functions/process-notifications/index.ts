import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface NotificationRecord {
  id: string
  type: string
  recipient_id: string | null
  recipient_email: string | null
  subject: string
  template_name: string
  template_data: Record<string, any>
  attempts: number
}

// Email templates
const templates: Record<string, (data: Record<string, any>) => string> = {
  workflow_review_required: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Review Required: ${data.contentTitle}</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have been assigned to review content for <strong>${data.brandName}</strong>.</p>
          <p><strong>Workflow Step:</strong> ${data.workflowStep}</p>
          ${data.comment ? `<p><strong>Previous Reviewer's Comment:</strong> ${data.comment}</p>` : ''}
          <a href="${data.actionUrl}" class="button">Review Now</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from MixerAI.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  workflow_approved: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Content Approved: ${data.contentTitle}</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Great news! Your content for <strong>${data.brandName}</strong> has been approved.</p>
          ${data.comment ? `<p><strong>Reviewer's Comment:</strong> ${data.comment}</p>` : ''}
          <p>The content is now ready for publication.</p>
        </div>
        <div class="footer">
          <p>This is an automated notification from MixerAI.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  workflow_rejected: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin-top: 16px; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Content Rejected: ${data.contentTitle}</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Your content for <strong>${data.brandName}</strong> needs revision.</p>
          <p><strong>Reviewer's Feedback:</strong> ${data.comment || 'Please review and revise the content.'}</p>
          <a href="${data.actionUrl}" class="button">View Content</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from MixerAI.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // Claim notifications for processing
    const { data: notifications, error } = await supabase.rpc('claim_notifications', {
      p_limit: 25
    })

    if (error) {
      console.error('Error claiming notifications:', error)
      return new Response(JSON.stringify({ error: 'Failed to claim notifications' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: 'No notifications to process' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const results = []
    
    for (const notification of notifications as NotificationRecord[]) {
      try {
        // Get the template
        const templateFunc = templates[notification.template_name]
        if (!templateFunc) {
          throw new Error(`Template ${notification.template_name} not found`)
        }
        
        // Render the email HTML
        const html = templateFunc(notification.template_data)
        
        // Determine recipient email
        let recipientEmail = notification.recipient_email
        if (!recipientEmail && notification.recipient_id) {
          // Fetch email from auth.users
          const { data: userData } = await supabase
            .from('auth.users')
            .select('email')
            .eq('id', notification.recipient_id)
            .single()
          
          recipientEmail = userData?.email
        }
        
        if (!recipientEmail) {
          throw new Error('No recipient email found')
        }
        
        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'MixerAI <notifications@mixerai.com>',
            to: recipientEmail,
            subject: notification.subject,
            html: html
          })
        })

        if (response.ok) {
          // Mark as sent
          await supabase
            .from('notification_outbox')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', notification.id)
          
          results.push({ id: notification.id, status: 'sent' })
        } else {
          const errorText = await response.text()
          throw new Error(`Resend API error: ${response.status} - ${errorText}`)
        }
      } catch (error: any) {
        console.error(`Error processing notification ${notification.id}:`, error)
        
        // Mark as failed or pending based on attempts
        const isFinalAttempt = notification.attempts >= 3
        await supabase
          .from('notification_outbox')
          .update({ 
            status: isFinalAttempt ? 'failed' : 'pending',
            error_message: error.message,
            failed_at: isFinalAttempt ? new Date().toISOString() : null
          })
          .eq('id', notification.id)
        
        results.push({ 
          id: notification.id, 
          status: isFinalAttempt ? 'failed' : 'retry', 
          error: error.message 
        })
      }
    }

    return new Response(JSON.stringify({ 
      processed: results.length, 
      results 
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    console.error('Error in notification processor:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})