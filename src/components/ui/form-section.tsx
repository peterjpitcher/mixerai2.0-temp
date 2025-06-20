import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function FormSection({ 
  title, 
  description, 
  children,
  className,
  headerClassName,
  contentClassName
}: FormSectionProps) {
  return (
    <Card className={cn("mb-6", className)}>
      <CardHeader className={headerClassName}>
        <CardTitle>{title}</CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FormRow({ children, className }: FormRowProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      {children}
    </div>
  );
}

interface FormFieldGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormFieldGroup({ children, className }: FormFieldGroupProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}