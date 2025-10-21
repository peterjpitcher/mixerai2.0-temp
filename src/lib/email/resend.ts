import { Resend } from 'resend';

const buildPhase = ['phase-production-build', 'phase-development-build', 'phase-export']
  .includes(process.env.NEXT_PHASE || '');

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Log configuration status on initialization outside of build steps to avoid noisy output
if (!process.env.RESEND_API_KEY && !buildPhase) {
  console.warn('[Email Service] RESEND_API_KEY not configured - email notifications will be disabled');
} else if (process.env.RESEND_API_KEY && !buildPhase) {
  console.info('[Email Service] Resend client initialized successfully');
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = process.env.EMAIL_FROM_ADDRESS || 'MixerAI <notifications@mixerai.com>',
  replyTo
}: EmailOptions) {
  if (!resend) {
    console.info('Email sending is disabled - RESEND_API_KEY not configured');
    return { success: true, error: undefined };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo: replyTo
    });

    if (error) {
      console.error('Error sending email:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendEmail:', error);
    throw error;
  }
}

export default resend;
