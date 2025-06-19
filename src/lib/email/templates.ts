interface BaseEmailData {
  userName: string;
  appUrl: string;
}

interface TaskAssignmentData extends BaseEmailData {
  taskTitle: string;
  contentTitle: string;
  brandName: string;
  workflowStep: string;
  dueDate?: string;
  assignedBy?: string;
}

interface WorkflowActionData extends BaseEmailData {
  contentTitle: string;
  brandName: string;
  action: 'approved' | 'rejected';
  feedback?: string;
  reviewerName: string;
  nextStep?: string;
}

interface DeadlineReminderData extends BaseEmailData {
  contentTitle: string;
  brandName: string;
  dueDate: string;
  workflowStep: string;
}

export function taskAssignmentTemplate(data: TaskAssignmentData): { subject: string; html: string; text: string } {
  const subject = `New Task: ${data.taskTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .task-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .task-details h3 { margin-top: 0; color: #495057; }
        .task-details p { margin: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #212529;">New Task Assigned</h1>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          
          <p>You have been assigned a new task in the workflow for <strong>${data.contentTitle}</strong>.</p>
          
          <div class="task-details">
            <h3>Task Details</h3>
            <p><strong>Content:</strong> ${data.contentTitle}</p>
            <p><strong>Brand:</strong> ${data.brandName}</p>
            <p><strong>Workflow Step:</strong> ${data.workflowStep}</p>
            ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
            ${data.assignedBy ? `<p><strong>Assigned By:</strong> ${data.assignedBy}</p>` : ''}
          </div>
          
          <p>Please review and take action on this task:</p>
          
          <div style="text-align: center;">
            <a href="${data.appUrl}/dashboard/my-tasks" class="button">View My Tasks</a>
          </div>
          
          <p>If you have any questions, please contact your workflow administrator.</p>
          
          <p>Best regards,<br>The MixerAI Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} MixerAI. All rights reserved.</p>
          <p>
            <a href="${data.appUrl}/dashboard/account" style="color: #6c757d;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
New Task Assigned

Hi ${data.userName},

You have been assigned a new task in the workflow for "${data.contentTitle}".

Task Details:
- Content: ${data.contentTitle}
- Brand: ${data.brandName}
- Workflow Step: ${data.workflowStep}
${data.dueDate ? `- Due Date: ${data.dueDate}` : ''}
${data.assignedBy ? `- Assigned By: ${data.assignedBy}` : ''}

Please review and take action on this task:
${data.appUrl}/dashboard/my-tasks

Best regards,
The MixerAI Team
  `.trim();
  
  return { subject, html, text };
}

export function workflowActionTemplate(data: WorkflowActionData): { subject: string; html: string; text: string } {
  const subject = `Content ${data.action === 'approved' ? 'Approved' : 'Rejected'}: ${data.contentTitle}`;
  const statusColor = data.action === 'approved' ? '#28a745' : '#dc3545';
  const statusText = data.action === 'approved' ? 'Approved' : 'Rejected';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 10px 10px; }
        .status-badge { display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .feedback-box { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${statusColor}; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #212529;">Workflow Update</h1>
          <div style="margin-top: 20px;">
            <span class="status-badge">${statusText}</span>
          </div>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          
          <p>Your content <strong>"${data.contentTitle}"</strong> for ${data.brandName} has been ${statusText.toLowerCase()} by ${data.reviewerName}.</p>
          
          ${data.feedback ? `
          <div class="feedback-box">
            <h3 style="margin-top: 0;">Reviewer Feedback</h3>
            <p>${data.feedback}</p>
          </div>
          ` : ''}
          
          ${data.nextStep && data.action === 'approved' ? `
          <p>The content has moved to the next step: <strong>${data.nextStep}</strong></p>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${data.appUrl}/dashboard/content" class="button">View Content</a>
          </div>
          
          <p>Best regards,<br>The MixerAI Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} MixerAI. All rights reserved.</p>
          <p>
            <a href="${data.appUrl}/dashboard/account" style="color: #6c757d;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Workflow Update: Content ${statusText}

Hi ${data.userName},

Your content "${data.contentTitle}" for ${data.brandName} has been ${statusText.toLowerCase()} by ${data.reviewerName}.

${data.feedback ? `Reviewer Feedback:\n${data.feedback}\n` : ''}
${data.nextStep && data.action === 'approved' ? `The content has moved to the next step: ${data.nextStep}\n` : ''}

View your content:
${data.appUrl}/dashboard/content

Best regards,
The MixerAI Team
  `.trim();
  
  return { subject, html, text };
}

export function deadlineReminderTemplate(data: DeadlineReminderData): { subject: string; html: string; text: string } {
  const subject = `Reminder: Content Due ${data.dueDate}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #fff3cd; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #ffc107; color: #212529; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 14px; }
        .deadline-box { background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; color: #856404;">⏰ Deadline Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${data.userName},</p>
          
          <p>This is a reminder that the following content has an upcoming deadline:</p>
          
          <div class="deadline-box">
            <h3 style="margin-top: 0; color: #856404;">Content Details</h3>
            <p><strong>Title:</strong> ${data.contentTitle}</p>
            <p><strong>Brand:</strong> ${data.brandName}</p>
            <p><strong>Current Step:</strong> ${data.workflowStep}</p>
            <p><strong>Due Date:</strong> ${data.dueDate}</p>
          </div>
          
          <p>Please ensure you complete your tasks before the deadline.</p>
          
          <div style="text-align: center;">
            <a href="${data.appUrl}/dashboard/my-tasks" class="button">View My Tasks</a>
          </div>
          
          <p>Best regards,<br>The MixerAI Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} MixerAI. All rights reserved.</p>
          <p>
            <a href="${data.appUrl}/dashboard/account" style="color: #6c757d;">Manage email preferences</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Deadline Reminder

Hi ${data.userName},

This is a reminder that the following content has an upcoming deadline:

Content Details:
- Title: ${data.contentTitle}
- Brand: ${data.brandName}
- Current Step: ${data.workflowStep}
- Due Date: ${data.dueDate}

Please ensure you complete your tasks before the deadline.

View your tasks:
${data.appUrl}/dashboard/my-tasks

Best regards,
The MixerAI Team
  `.trim();
  
  return { subject, html, text };
}