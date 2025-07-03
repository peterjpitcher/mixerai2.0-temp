'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Globe } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface GlobalOverrideConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { forceGlobal?: boolean }) => void;
  claimText: string;
  affectedCountries: number;
  conflicts?: Array<{
    country: string;
    countryName?: string;
    isBlocked: boolean;
  }>;
}

export function GlobalOverrideConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  claimText,
  affectedCountries,
  conflicts = []
}: GlobalOverrideConfirmDialogProps) {
  const [forceGlobal, setForceGlobal] = useState(false);
  
  // Ensure conflicts is always an array
  const safeConflicts = Array.isArray(conflicts) ? conflicts : [];

  const handleConfirm = () => {
    onConfirm({ forceGlobal });
    setForceGlobal(false); // Reset for next time
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" />
            Confirm Global Override
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to create a global override for the following claim:
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium text-gray-900">{claimText}</p>
              </div>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This action will affect <strong>{affectedCountries} countries</strong> worldwide.
                  {safeConflicts.length > 0 && (
                    <span className="block mt-2">
                      Note: {safeConflicts.length} country-specific override(s) exist and will take precedence.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              {safeConflicts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Existing country overrides:</p>
                  <ul className="text-sm text-gray-600 list-disc list-inside max-h-32 overflow-y-auto">
                    {safeConflicts.map(conflict => (
                      <li key={conflict.country}>
                        {conflict.countryName || conflict.country}: {conflict.isBlocked ? 'Blocked' : 'Replaced'}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mt-3">
                    <Checkbox
                      id="force-global"
                      checked={forceGlobal}
                      onCheckedChange={(checked) => setForceGlobal(checked as boolean)}
                    />
                    <label htmlFor="force-global" className="text-sm cursor-pointer">
                      Remove country-specific overrides and apply global block
                    </label>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Create Global Override
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}