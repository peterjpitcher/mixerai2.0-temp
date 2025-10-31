import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

import { withAuth } from '@/lib/auth/api-auth';

const FeedbackSchema = z.object({
  articleSlug: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid article slug'),
  articleTitle: z.string().min(1).max(200),
  helpful: z.boolean(),
  comments: z.string().max(1000).optional(),
});

const feedbackDir = path.join(process.cwd(), 'temp', 'feedback');
const feedbackFile = path.join(feedbackDir, 'help-feedback.ndjson');

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const payload = FeedbackSchema.parse(await request.json());
    const entry = {
      ...payload,
      comments: payload.comments?.trim() || undefined,
      userId: user.id,
      submittedAt: new Date().toISOString(),
    };

    await fs.mkdir(feedbackDir, { recursive: true });
    await fs.appendFile(feedbackFile, JSON.stringify(entry) + '\n', 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback payload',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Failed to persist help feedback:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to capture feedback',
      },
      { status: 500 }
    );
  }
});

