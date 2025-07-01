'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface RejectionFeedbackProps {
  feedback?: string;
  reviewerName?: string;
  rejectedAt?: string;
}

export function RejectionFeedbackCard({
  feedback,
  reviewerName,
  rejectedAt,
}: RejectionFeedbackProps) {
  if (!feedback) {
    return null;
  }

  return (
    <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <CardTitle className="text-red-900 dark:text-red-100">Content Rejected</CardTitle>
        </div>
        <CardDescription>
          Please address the feedback below before resubmitting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-red-900 dark:text-red-100">Rejection Feedback:</h4>
          <div className="p-4 bg-white dark:bg-gray-900 rounded-md border border-red-200 dark:border-red-900">
            <p className="text-sm whitespace-pre-wrap">{feedback}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {reviewerName && (
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>Reviewed by: {reviewerName}</span>
            </div>
          )}
          {rejectedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(rejectedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}