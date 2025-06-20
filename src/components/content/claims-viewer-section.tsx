'use client';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { StyledClaims } from '@/types/claims';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ClaimsViewerSectionProps {
  productName: string;
  styledClaims: StyledClaims | null;
}

export function ClaimsViewerSection({ 
  productName, 
  styledClaims 
}: ClaimsViewerSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!styledClaims) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-4 h-auto font-normal"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">Product Claims for {productName}</span>
              <span className="text-xs text-muted-foreground">
                ({styledClaims.grouped_claims.reduce((acc, g) => acc + g.allowed_claims.length + g.disallowed_claims.length, 0)} total claims)
              </span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4">
            <Separator />
            
            {/* Overview */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Overview</h3>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                {styledClaims.introductory_sentence}
              </p>
            </div>
            
            {/* Grouped Claims */}
            {styledClaims.grouped_claims.map((group, index) => {
              const hasAllowed = group.allowed_claims.length > 0;
              const hasDisallowed = group.disallowed_claims.length > 0;
              
              if (!hasAllowed && !hasDisallowed) return null;
              
              return (
                <div key={index}>
                  <Separator className="mb-4" />
                  <h3 className="text-sm font-semibold mb-2">{group.level} Level Claims</h3>
                  
                  <div className="space-y-2">
                    {hasAllowed && (
                      <div>
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                          Allowed ({group.allowed_claims.length})
                        </p>
                        <div className="grid gap-1">
                          {group.allowed_claims.map((claim, claimIndex) => (
                            <div key={claimIndex} className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                              {typeof claim === 'string' ? claim : claim.text || JSON.stringify(claim)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {hasDisallowed && (
                      <div>
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                          Disallowed ({group.disallowed_claims.length})
                        </p>
                        <div className="grid gap-1">
                          {group.disallowed_claims.map((claim, claimIndex) => (
                            <div key={claimIndex} className="p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                              {typeof claim === 'string' ? claim : claim.text || JSON.stringify(claim)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}