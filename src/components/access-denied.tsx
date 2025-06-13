import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';

interface AccessDeniedProps {
  message?: string;
  showGoToDashboardButton?: boolean;
}

export function AccessDenied({ 
  message = "You do not have permission to access this page.",
  showGoToDashboardButton = true 
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height,theme(spacing.16))-theme(spacing.12))] p-4 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
      <h3 className="text-2xl font-bold mb-2">Access Denied</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      {showGoToDashboardButton && (
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      )}
    </div>
  );
} 