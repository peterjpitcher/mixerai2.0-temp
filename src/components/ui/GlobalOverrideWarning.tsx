import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface GlobalOverrideWarningProps {
  affectedCountries?: number;
  existingOverrides?: string[];
}

export function GlobalOverrideWarning({
  affectedCountries,
  existingOverrides = []
}: GlobalOverrideWarningProps) {
  // Ensure existingOverrides is always an array
  const overrides = existingOverrides || [];
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Global Override Warning</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          This action will block the claim across {affectedCountries || 'all'} countries worldwide.
        </p>
        {overrides.length > 0 && (
          <p className="text-sm">
            Note: Existing country-specific overrides in {overrides.join(', ')} 
            will remain active and take precedence.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}