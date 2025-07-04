# Enhancement: Global Claims Blocking ("All Countries" Feature) - Version 2

## Executive Summary

This enhancement adds the ability to block claims globally across all countries with a single action. This document has been revised based on developer feedback and codebase analysis to ensure accuracy and completeness.

## Business Requirements

### Problem Statement
Currently, to block a claim across all markets, users must:
1. Navigate to each country individually
2. Create a separate override for each country (potentially 50+ entries)
3. Risk missing countries or inconsistent application
4. Spend significant time on repetitive tasks

### Solution
Implement a "global blocking" feature using the existing `__ALL_COUNTRIES__` constant as a special country code in the `market_claim_overrides` table, with proper safeguards and UI support.

### Success Criteria
- Users can block/replace claims globally with one action
- Global blocks are clearly distinguished from country-specific blocks
- System maintains data integrity and performance
- Clear precedence rules when both global and country-specific overrides exist
- Proper audit trail and permission controls (admin role only)

## Technical Specification

### Architecture Analysis

Based on codebase discovery:
- ✅ `market_claim_overrides` table exists with suitable structure
- ✅ No CHECK constraints preventing `__ALL_COUNTRIES__` usage
- ✅ Constant already defined in `/src/lib/constants/country-codes.ts`
- ❌ Claims resolution logic doesn't handle global overrides
- ❌ API validation currently blocks all special country codes

### Database Changes

#### 1. Migration Script with Rollback Support
```sql
-- Migration: Enable global claims blocking with proper safeguards
-- Date: 2025-07-XX
-- Version: 1.0.0

BEGIN;

-- Create composite index for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_claim_overrides_global 
ON market_claim_overrides(master_claim_id, target_product_id, market_country_code) 
WHERE market_country_code = '__ALL_COUNTRIES__';

-- Add CHECK constraint to ensure valid country codes
ALTER TABLE market_claim_overrides 
ADD CONSTRAINT market_claim_overrides_country_code_valid CHECK (
    market_country_code = '__ALL_COUNTRIES__' OR 
    market_country_code = ANY(
        SELECT code FROM countries WHERE is_active = true
    )
);

-- Add comment for documentation
COMMENT ON TABLE market_claim_overrides IS 
'Stores claim overrides by market. Use __ALL_COUNTRIES__ for global blocks. Precedence: Country-specific > Global > Base claims';

-- Create audit table for global operations
CREATE TABLE IF NOT EXISTS global_override_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    override_id UUID NOT NULL REFERENCES market_claim_overrides(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    user_id UUID NOT NULL,
    affected_countries TEXT[] NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for global overrides
CREATE POLICY "global_overrides_admin_only" ON market_claim_overrides
    FOR ALL
    USING (
        market_country_code != '__ALL_COUNTRIES__' OR
        EXISTS (
            SELECT 1 FROM user_brand_permissions ubp
            JOIN products p ON p.master_brand_id = ubp.brand_id
            WHERE p.id = market_claim_overrides.target_product_id
            AND ubp.user_id = auth.uid()
            AND ubp.role = 'admin'
        )
    );

COMMIT;

-- Rollback script (save separately)
-- BEGIN;
-- DROP INDEX IF EXISTS idx_market_claim_overrides_global;
-- ALTER TABLE market_claim_overrides DROP CONSTRAINT IF EXISTS market_claim_overrides_country_code_valid;
-- DROP TABLE IF EXISTS global_override_audit;
-- DROP POLICY IF EXISTS "global_overrides_admin_only" ON market_claim_overrides;
-- COMMIT;
```

### Backend Implementation

#### 1. Updated API Route with Comprehensive Validation

**File: `/src/app/api/market-overrides/route.ts`**

```typescript
import { z } from 'zod';
import { countries } from '@/lib/constants/countries';
import { ALL_COUNTRIES_CODE } from '@/lib/constants/country-codes';

// Enhanced validation schema
const CreateMarketOverrideSchema = z.object({
  masterClaimId: z.string().uuid(),
  marketCountryCode: z.string().refine(
    (code) => {
      // Allow __ALL_COUNTRIES__ or valid active country codes
      return code === ALL_COUNTRIES_CODE || 
             countries.some(c => c.code === code && c.is_active);
    },
    { message: 'Invalid or inactive country code' }
  ),
  targetProductId: z.string().uuid(),
  action: z.enum(['block', 'replace']),
  replacementText: z.string().optional(),
  forceGlobal: z.boolean().optional() // For overriding existing country-specific
});

export const POST = withAuthAndCSRF(async (req: NextRequest, { user }) => {
  const supabase = createServerClient();
  
  try {
    const body = await req.json();
    const data = CreateMarketOverrideSchema.parse(body);
    
    // Begin transaction
    const { data: product } = await supabase
      .from('products')
      .select('*, master_brand:master_claim_brands!inner(*)')
      .eq('id', data.targetProductId)
      .single();
      
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    
    // Permission check for global operations
    if (data.marketCountryCode === ALL_COUNTRIES_CODE) {
      const { data: permission } = await supabase
        .from('user_brand_permissions')
        .select('role')
        .eq('user_id', user.id)
        .eq('brand_id', product.master_brand_id)
        .single();
        
      if (!permission || permission.role !== 'admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions for global operations' },
          { status: 403 }
        );
      }
    }
    
    // Check for conflicts
    const conflicts = await checkForConflicts(supabase, data);
    
    if (conflicts.hasConflicts && !data.forceGlobal) {
      return NextResponse.json({
        error: 'Conflicts detected',
        conflicts: conflicts.details,
        requiresConfirmation: true
      }, { status: 409 });
    }
    
    // Create the override
    const { data: override, error } = await supabase
      .from('market_claim_overrides')
      .insert({
        master_claim_id: data.masterClaimId,
        market_country_code: data.marketCountryCode,
        target_product_id: data.targetProductId,
        is_blocked: data.action === 'block',
        replacement_claim_id: data.action === 'replace' ? 
          await getOrCreateReplacementClaim(data.replacementText) : null,
        created_by: user.id
      })
      .select()
      .single();
      
    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Override already exists for this combination' },
          { status: 400 }
        );
      }
      throw error;
    }
    
    // Audit global operations
    if (data.marketCountryCode === ALL_COUNTRIES_CODE) {
      await auditGlobalOperation(supabase, {
        overrideId: override.id,
        action: 'created',
        userId: user.id,
        affectedCountries: countries.filter(c => c.is_active).map(c => c.code),
        newState: override
      });
    }
    
    // Invalidate caches
    await invalidateClaimsCaches(product.id);
    
    return NextResponse.json({
      success: true,
      data: override,
      warnings: conflicts.hasConflicts ? {
        message: 'Global override created. Some country-specific overrides remain active.',
        conflicts: conflicts.details
      } : undefined
    });
    
  } catch (error) {
    return handleApiError(error);
  }
});

// Helper function to check for conflicts
async function checkForConflicts(supabase: any, data: any) {
  if (data.marketCountryCode !== ALL_COUNTRIES_CODE) {
    // Check if global override exists
    const { data: globalOverride } = await supabase
      .from('market_claim_overrides')
      .select('id')
      .eq('master_claim_id', data.masterClaimId)
      .eq('target_product_id', data.targetProductId)
      .eq('market_country_code', ALL_COUNTRIES_CODE)
      .single();
      
    return {
      hasConflicts: !!globalOverride,
      details: globalOverride ? [{
        type: 'global_exists',
        message: 'A global override already exists for this claim'
      }] : []
    };
  }
  
  // For global overrides, check country-specific ones
  const { data: countryOverrides } = await supabase
    .from('market_claim_overrides')
    .select('market_country_code, is_blocked')
    .eq('master_claim_id', data.masterClaimId)
    .eq('target_product_id', data.targetProductId)
    .neq('market_country_code', ALL_COUNTRIES_CODE);
    
  return {
    hasConflicts: countryOverrides?.length > 0,
    details: countryOverrides?.map(o => ({
      type: 'country_specific_exists',
      country: o.market_country_code,
      isBlocked: o.is_blocked
    }))
  };
}
```

#### 2. Enhanced Claims Resolution Logic with Precedence Rules

**File: `/src/lib/claims-utils.ts`**

```typescript
export async function getStackedClaimsForProduct(
  productId: string,
  countryCode: string,
  options?: GetClaimsOptions
): Promise<StackedClaimsResult> {
  const supabase = createSupabaseServerClient();
  
  // Fetch all relevant data in parallel for performance
  const [
    productData,
    baseClaims,
    overridesData
  ] = await Promise.all([
    fetchProductWithIngredients(supabase, productId),
    fetchBaseClaims(supabase, productId, countryCode),
    fetchOverrides(supabase, productId, countryCode)
  ]);
  
  // Apply precedence rules
  const effectiveClaims = applyClaimsPrecedence(
    baseClaims,
    overridesData,
    countryCode
  );
  
  return {
    product: productData,
    effectiveClaims,
    overrideInfo: overridesData.overrideInfo,
    metadata: {
      totalClaims: effectiveClaims.length,
      overriddenClaims: Object.keys(overridesData.overrideInfo).length,
      hasGlobalOverrides: overridesData.hasGlobalOverrides
    }
  };
}

async function fetchOverrides(supabase: any, productId: string, countryCode: string) {
  // Fetch both global and country-specific overrides in one query
  const { data: overrides, error } = await supabase
    .from('market_claim_overrides')
    .select(`
      *,
      master_claim:claims!market_claim_overrides_master_claim_id_fkey(*),
      replacement_claim:claims!market_claim_overrides_replacement_claim_id_fkey(*)
    `)
    .eq('target_product_id', productId)
    .in('market_country_code', [ALL_COUNTRIES_CODE, countryCode])
    .order('market_country_code', { ascending: false }); // Country-specific first
    
  if (error) throw error;
  
  const overrideInfo: Record<string, MarketClaimOverrideInfo> = {};
  const hasGlobalOverrides = overrides?.some(o => 
    o.market_country_code === ALL_COUNTRIES_CODE
  );
  
  // Process overrides with precedence rules
  for (const override of overrides || []) {
    const masterClaimId = override.master_claim_id;
    
    // Skip if already processed (country-specific takes precedence)
    if (overrideInfo[masterClaimId]) continue;
    
    overrideInfo[masterClaimId] = {
      overrideId: override.id,
      isBlocked: override.is_blocked,
      marketCountryCode: override.market_country_code,
      replacementClaim: override.replacement_claim,
      isGlobalOverride: override.market_country_code === ALL_COUNTRIES_CODE,
      affectedCountries: override.market_country_code === ALL_COUNTRIES_CODE ? 
        await getActiveCountryCodes() : [override.market_country_code]
    };
  }
  
  return { overrideInfo, hasGlobalOverrides };
}

// Clear precedence rules implementation
function applyClaimsPrecedence(
  baseClaims: ClaimsData,
  overridesData: OverridesData,
  countryCode: string
): Claim[] {
  const { overrideInfo } = overridesData;
  const effectiveClaims: Map<string, Claim> = new Map();
  
  // Precedence order (highest to lowest):
  // 1. Country-specific override (block or replace)
  // 2. Global override (block or replace)
  // 3. Market-specific claims (product > ingredient > brand)
  // 4. Global claims (product > ingredient > brand)
  
  // First, add all base claims
  const allClaims = [
    ...baseClaims.marketBrandClaims,
    ...baseClaims.marketIngredientClaims,
    ...baseClaims.marketProductClaims,
    ...baseClaims.globalBrandClaims,
    ...baseClaims.globalIngredientClaims,
    ...baseClaims.globalProductClaims
  ];
  
  for (const claim of allClaims) {
    const override = overrideInfo[claim.id];
    
    if (override?.isBlocked) {
      // Claim is blocked, skip it
      continue;
    } else if (override?.replacementClaim) {
      // Use replacement claim
      effectiveClaims.set(claim.id, override.replacementClaim);
    } else {
      // Use original claim
      effectiveClaims.set(claim.id, claim);
    }
  }
  
  return Array.from(effectiveClaims.values());
}
```

#### 3. Cache Management Strategy

```typescript
// lib/cache-utils.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

const CACHE_TTL = 300; // 5 minutes for claims data
const GLOBAL_OVERRIDE_TTL = 3600; // 1 hour for global overrides

export async function getCachedClaims(key: string) {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached as string) : null;
  } catch {
    return null; // Fail gracefully
  }
}

export async function setCachedClaims(key: string, data: any, isGlobal = false) {
  try {
    await redis.setex(
      key,
      isGlobal ? GLOBAL_OVERRIDE_TTL : CACHE_TTL,
      JSON.stringify(data)
    );
  } catch {
    // Log error but don't fail the request
  }
}

export async function invalidateClaimsCaches(productId: string) {
  try {
    // Invalidate all country-specific caches for this product
    const pattern = `claims:${productId}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Log error but don't fail
  }
}
```

### Frontend Implementation

#### 1. Enhanced UI Components with Accessibility

**Component: `GlobalOverrideIndicator.tsx`**
```tsx
import { Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/use-translation';

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
  const { t } = useTranslation();
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
            aria-label={t('claims.global_override_label')}
          >
            <Globe className={`${sizeClasses[size]} mr-1`} aria-hidden="true" />
            {showLabel && <span>{t('claims.global')}</span>}
            {conflictCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {conflictCount}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('claims.global_override_tooltip')}</p>
          {conflictCount > 0 && (
            <p className="text-orange-300 text-sm mt-1">
              {t('claims.conflicts_exist', { count: conflictCount })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Component: `GlobalOverrideConfirmDialog.tsx`**
```tsx
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

interface GlobalOverrideConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: { forceGlobal?: boolean }) => void;
  claimText: string;
  affectedCountries: number;
  conflicts?: Array<{
    country: string;
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
                  {conflicts.length > 0 && (
                    <span className="block mt-2">
                      Note: {conflicts.length} country-specific override(s) exist and will take precedence.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              {conflicts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Existing country overrides:</p>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {conflicts.map(conflict => (
                      <li key={conflict.country}>
                        {conflict.country}: {conflict.isBlocked ? 'Blocked' : 'Replaced'}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      id="force-global"
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="force-global" className="text-sm">
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
            onClick={() => {
              const forceGlobal = (document.getElementById('force-global') as HTMLInputElement)?.checked;
              onConfirm({ forceGlobal });
            }}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Create Global Override
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### 2. Updated Override Management Page

**File: `/src/app/dashboard/claims/overrides/page.tsx`**

```tsx
// State management for global operations
const [isGlobalOverride, setIsGlobalOverride] = useState(false);
const [showGlobalConfirm, setShowGlobalConfirm] = useState(false);
const [pendingOverride, setPendingOverride] = useState<CreateOverrideData | null>(null);
const [conflicts, setConflicts] = useState<ConflictData[]>([]);

// Permission check for global operations
const canCreateGlobalOverrides = userPermissions.includes('manage_global_claims');

// Handle global override toggle
const handleGlobalToggle = useCallback((checked: boolean) => {
  setIsGlobalOverride(checked);
  if (checked) {
    setSelectedCountryCode(ALL_COUNTRIES_CODE);
    // Clear any multi-select state
    setSelectedCountries([]);
  } else {
    setSelectedCountryCode('');
  }
}, []);

// Handle override creation with conflict detection
const handleCreateOverride = async (data: CreateOverrideData) => {
  if (data.marketCountryCode === ALL_COUNTRIES_CODE) {
    // Check for conflicts first
    try {
      const response = await fetch('/api/market-overrides/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.conflicts?.length > 0) {
        setConflicts(result.conflicts);
        setPendingOverride(data);
        setShowGlobalConfirm(true);
        return;
      }
    } catch (error) {
      toast.error('Failed to check for conflicts');
      return;
    }
  }
  
  // Proceed with creation
  await createOverride(data);
};

// Render UI with global override support
return (
  <div className="space-y-6">
    {/* Global Override Toggle */}
    {canCreateGlobalOverrides && (
      <Card className="p-4 border-purple-200 bg-purple-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="h-5 w-5 text-purple-600" />
            <div>
              <Label htmlFor="global-override" className="text-base font-medium">
                Global Override Mode
              </Label>
              <p className="text-sm text-gray-600">
                Apply overrides to all countries at once
              </p>
            </div>
          </div>
          <Switch
            id="global-override"
            checked={isGlobalOverride}
            onCheckedChange={handleGlobalToggle}
            aria-label="Toggle global override mode"
          />
        </div>
      </Card>
    )}
    
    {/* Country Selector - disabled in global mode */}
    {!isGlobalOverride && (
      <Select 
        value={selectedCountryCode} 
        onValueChange={setSelectedCountryCode}
        disabled={isLoadingCountries}
      >
        <SelectTrigger aria-label="Select country">
          <SelectValue placeholder="Select a country/market" />
        </SelectTrigger>
        <SelectContent>
          {countries.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
    
    {/* Global override warning */}
    {isGlobalOverride && (
      <GlobalOverrideWarning 
        affectedCountries={countries.filter(c => c.is_active).length}
      />
    )}
    
    {/* Overrides table with global indicators */}
    <OverridesTable 
      overrides={overrides}
      onEdit={handleEditOverride}
      onDelete={handleDeleteOverride}
      renderMarketCell={(override) => (
        override.market_country_code === ALL_COUNTRIES_CODE ? (
          <GlobalOverrideIndicator 
            conflictCount={getConflictCount(override)}
          />
        ) : (
          <Badge variant="outline">
            {getCountryName(override.market_country_code)}
          </Badge>
        )
      )}
    />
    
    {/* Global confirmation dialog */}
    <GlobalOverrideConfirmDialog
      open={showGlobalConfirm}
      onOpenChange={setShowGlobalConfirm}
      onConfirm={async ({ forceGlobal }) => {
        if (pendingOverride) {
          await createOverride({
            ...pendingOverride,
            forceGlobal
          });
        }
      }}
      claimText={pendingOverride?.claimText || ''}
      affectedCountries={countries.filter(c => c.is_active).length}
      conflicts={conflicts}
    />
  </div>
);
```

### Testing Strategy

#### Comprehensive Test Suite

```typescript
// __tests__/global-overrides.test.ts
describe('Global Overrides Feature', () => {
  describe('Permission Checks', () => {
    it('should allow admins to create global overrides', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer admin-token' },
        body: {
          masterClaimId: 'claim-id',
          marketCountryCode: '__ALL_COUNTRIES__',
          targetProductId: 'product-id',
          action: 'block'
        }
      });
      
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    });
    
    it('should reject viewers from creating global overrides', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer viewer-token' },
        body: {
          marketCountryCode: '__ALL_COUNTRIES__',
          // ...
        }
      });
      
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });
  });
  
  describe('Conflict Resolution', () => {
    it('should detect country-specific conflicts', async () => {
      // Create country-specific override first
      await createOverride({ marketCountryCode: 'US', /*...*/ });
      
      // Attempt global override
      const response = await createOverride({ 
        marketCountryCode: '__ALL_COUNTRIES__',
        /*...*/
      });
      
      expect(response.status).toBe(409);
      expect(response.body.conflicts).toHaveLength(1);
      expect(response.body.requiresConfirmation).toBe(true);
    });
    
    it('should handle force global flag', async () => {
      // Existing country overrides
      await createOverride({ marketCountryCode: 'US', /*...*/ });
      await createOverride({ marketCountryCode: 'GB', /*...*/ });
      
      // Force global
      const response = await createOverride({
        marketCountryCode: '__ALL_COUNTRIES__',
        forceGlobal: true,
        /*...*/
      });
      
      expect(response.status).toBe(200);
      expect(response.body.warnings).toBeDefined();
    });
  });
  
  describe('Precedence Rules', () => {
    it('country-specific should override global', async () => {
      // Create global block
      await createOverride({
        marketCountryCode: '__ALL_COUNTRIES__',
        action: 'block',
        /*...*/
      });
      
      // Create country-specific replacement
      await createOverride({
        marketCountryCode: 'FR',
        action: 'replace',
        replacementText: 'French specific claim',
        /*...*/
      });
      
      // Check France gets replacement
      const frResult = await getStackedClaims('product-id', 'FR');
      expect(frResult.effectiveClaims).toContainEqual(
        expect.objectContaining({ claim_text: 'French specific claim' })
      );
      
      // Check other countries get blocked
      const usResult = await getStackedClaims('product-id', 'US');
      expect(usResult.effectiveClaims).not.toContainEqual(
        expect.objectContaining({ id: 'blocked-claim-id' })
      );
    });
  });
  
  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 1000 products with global overrides
      const startTime = Date.now();
      
      await Promise.all(
        Array.from({ length: 1000 }, (_, i) => 
          createOverride({
            marketCountryCode: '__ALL_COUNTRIES__',
            targetProductId: `product-${i}`,
            /*...*/
          })
        )
      );
      
      const queryTime = Date.now();
      const results = await getStackedClaims('product-500', 'US');
      const endTime = Date.now();
      
      expect(endTime - queryTime).toBeLessThan(100); // Under 100ms
      expect(results).toBeDefined();
    });
  });
});
```

### Rollout Plan

#### Phase 1: Infrastructure (Days 1-3)
1. Deploy database migration with rollback plan ready
2. Deploy updated API with feature flag disabled
3. Monitor for any issues with existing functionality

#### Phase 2: Backend Activation (Days 4-5)  
1. Enable feature flag for internal testing
2. Create test global overrides
3. Verify claims resolution logic
4. Test cache invalidation

#### Phase 3: UI Deployment (Days 6-8)
1. Deploy UI components (hidden behind permission)
2. Grant permissions to pilot users
3. Gather feedback and iterate
4. Create user documentation

#### Phase 4: General Availability (Days 9-10)
1. Enable for all authorized users
2. Monitor usage patterns
3. Measure performance impact
4. Plan future enhancements

### Monitoring & Telemetry

```typescript
// Track global override operations
async function trackGlobalOverride(event: {
  action: 'created' | 'updated' | 'deleted';
  userId: string;
  productId: string;
  affectedCountries: number;
  hasConflicts: boolean;
}) {
  await analytics.track('global_override', {
    ...event,
    timestamp: new Date().toISOString()
  });
}

// Monitor performance
async function monitorClaimsResolution(metrics: {
  productId: string;
  countryCode: string;
  queryTime: number;
  hasGlobalOverrides: boolean;
  cacheHit: boolean;
}) {
  await metrics.record('claims_resolution', metrics);
}
```

### Future Enhancements

1. **Regional Blocks**: Support for blocking claims in predefined regions (EU, APAC, etc.)
2. **Bulk Operations**: UI for applying global blocks to multiple claims at once
3. **Scheduled Overrides**: Time-based activation/deactivation
4. **Override Templates**: Save and reuse common blocking patterns
5. **API Extensions**: REST endpoints for programmatic global override management

## Conclusion

This revised enhancement specification addresses all developer feedback:
- Corrects database assumptions and constraints
- Implements proper conflict resolution
- Adds comprehensive error handling and rollback support
- Includes performance optimizations and monitoring
- Provides clear precedence rules and testing strategies

The implementation maintains backward compatibility while adding powerful new functionality for global brand management.