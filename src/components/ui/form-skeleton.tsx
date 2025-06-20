import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface FormFieldSkeletonProps {
  showLabel?: boolean;
  fieldType?: 'input' | 'textarea' | 'select';
}

export function FormFieldSkeleton({ 
  showLabel = true,
  fieldType = 'input' 
}: FormFieldSkeletonProps) {
  const fieldHeight = {
    input: 'h-10',
    textarea: 'h-24',
    select: 'h-10'
  }[fieldType];

  return (
    <div className="space-y-2">
      {showLabel && <Skeleton className="h-4 w-24" />}
      <Skeleton className={`w-full ${fieldHeight}`} />
    </div>
  );
}

interface FormSectionSkeletonProps {
  title?: boolean;
  description?: boolean;
  fields?: number;
  fieldTypes?: Array<'input' | 'textarea' | 'select'>;
}

export function FormSectionSkeleton({ 
  title = true,
  description = true,
  fields = 3,
  fieldTypes
}: FormSectionSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        {title && <Skeleton className="h-6 w-1/3" />}
        {description && <Skeleton className="h-4 w-2/3 mt-2" />}
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <FormFieldSkeleton 
            key={i} 
            fieldType={fieldTypes?.[i] || 'input'}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface FormSkeletonProps {
  sections?: number;
  fieldsPerSection?: number;
  showButtons?: boolean;
}

export function FormSkeleton({ 
  sections = 2,
  fieldsPerSection = 3,
  showButtons = true 
}: FormSkeletonProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: sections }).map((_, i) => (
        <FormSectionSkeleton 
          key={i} 
          fields={fieldsPerSection}
        />
      ))}
      
      {showButtons && (
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  );
}