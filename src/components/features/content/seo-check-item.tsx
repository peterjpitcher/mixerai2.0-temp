import * as React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface SEOCheckItemProps {
  title: string;
  checked: boolean;
  critical?: boolean;
}

export function SEOCheckItem({ title, checked, critical = false }: SEOCheckItemProps) {
  return (
    <div className="flex items-center">
      {checked ? (
        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
      ) : (
        <AlertCircle className={`h-5 w-5 ${critical ? "text-red-500" : "text-amber-500"} mr-2 flex-shrink-0`} />
      )}
      <span className={`text-sm ${!checked && critical ? "text-red-500 font-medium" : ""}`}>
        {title}
      </span>
    </div>
  );
} 