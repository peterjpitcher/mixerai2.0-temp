import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GlobalOverrideIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  conflictCount?: number;
}

export function GlobalOverrideIndicator({ 
  size = 'md', 
  showLabel = true,
  conflictCount = 0
}: GlobalOverrideIndicatorProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className="bg-purple-100 text-purple-700 hover:bg-purple-200 relative"
            aria-label="Global override - applies to all countries"
          >
            <Globe className={`${sizeClasses[size]} mr-1`} aria-hidden="true" />
            {showLabel && <span>Global</span>}
            {conflictCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {conflictCount}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This override applies to all countries</p>
          {conflictCount > 0 && (
            <p className="text-orange-300 text-sm mt-1">
              {conflictCount} country-specific override{conflictCount > 1 ? 's' : ''} exist and will take precedence
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}