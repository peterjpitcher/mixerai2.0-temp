# Enhancement: Global Claims Blocking ("All Countries" Feature)

## Executive Summary

This enhancement adds the ability to block claims globally across all countries with a single action, rather than requiring individual overrides for each country. This feature will significantly improve efficiency for global brand managers who need to enforce claim restrictions worldwide.

## Business Requirements

### Problem Statement
Currently, to block a claim across all markets, users must:
1. Navigate to each country individually
2. Create a separate override for each country
3. Manage dozens of individual entries
4. Risk missing countries or inconsistent application

### Solution
Implement a "global blocking" feature that allows authorized users to block a claim across all countries with a single action.

### Success Criteria
- Users can block a claim globally with one action
- Global blocks are clearly distinguished from country-specific blocks
- System maintains backward compatibility with existing overrides
- Proper audit trail for global actions
- Performance remains unaffected

## Technical Specification

### Architecture Decision

**Selected Approach: Special Country Code Pattern**

We will use the existing `__ALL_COUNTRIES__` constant as a special country code in the `market_claim_overrides` table. This approach:
- Minimizes database schema changes
- Leverages existing infrastructure
- Maintains backward compatibility
- Simplifies implementation and rollback

### Database Changes

#### 1. Migration Script
```sql
-- Migration: Enable global claims blocking
-- Date: 2025-07-XX

-- Add index for performance optimization
CREATE INDEX IF NOT EXISTS idx_market_claim_overrides_global 
ON market_claim_overrides(master_claim_id, market_country_code) 
WHERE market_country_code = '__ALL_COUNTRIES__';

-- Add check to ensure __ALL_COUNTRIES__ is accepted
ALTER TABLE market_claim_overrides 
DROP CONSTRAINT IF EXISTS market_claim_overrides_market_country_code_check;

-- Add comment for documentation
COMMENT ON TABLE market_claim_overrides IS 
'Stores claim overrides by market. Use __ALL_COUNTRIES__ as market_country_code for global blocks.';
```

#### 2. Data Model
No structural changes required. The `market_claim_overrides` table will accept `__ALL_COUNTRIES__` as a valid `market_country_code`.

### Backend Implementation

#### 1. API Route Updates

**File: `/src/app/api/market-overrides/route.ts`**

```typescript
// Update validation schema
const CreateMarketOverrideSchema = z.object({
  masterClaimId: z.string().uuid(),
  marketCountryCode: z.string().refine(
    (code) => {
      // Allow __ALL_COUNTRIES__ or valid country codes
      return code === '__ALL_COUNTRIES__' || 
             countries.some(c => c.code === code);
    },
    { message: 'Invalid country code' }
  ),
  targetProductId: z.string().uuid(),
  action: z.enum(['block', 'replace']),
  replacementText: z.string().optional(),
});

// Add permission check for global blocks
if (data.marketCountryCode === '__ALL_COUNTRIES__') {
  // Check for elevated permissions
  const userRole = await getUserRole(user.id, product.master_brand_id);
  if (userRole !== 'admin' && userRole !== 'manager') {
    return NextResponse.json(
      { error: 'Insufficient permissions for global blocks' },
      { status: 403 }
    );
  }
}

// Add conflict check
if (data.marketCountryCode === '__ALL_COUNTRIES__') {
  // Check for existing country-specific overrides
  const existingOverrides = await supabase
    .from('market_claim_overrides')
    .select('market_country_code')
    .eq('master_claim_id', data.masterClaimId)
    .eq('target_product_id', data.targetProductId)
    .neq('market_country_code', '__ALL_COUNTRIES__');
    
  if (existingOverrides.data?.length > 0) {
    // Return warning in response
    return NextResponse.json({
      success: true,
      data: createdOverride,
      warnings: {
        existingOverrides: existingOverrides.data.map(o => o.market_country_code),
        message: 'Global block created. Existing country-specific overrides remain active.'
      }
    });
  }
}
```

#### 2. Claims Resolution Logic

**File: `/src/lib/claims-utils.ts`**

```typescript
export async function getStackedClaimsForProduct(
  productId: string,
  countryCode: string,
  options?: GetClaimsOptions
): Promise<StackedClaimsResult> {
  // ... existing code ...

  // Add global override check (higher priority than country-specific)
  const globalOverrides = await supabase
    .from('market_claim_overrides')
    .select(`
      *,
      master_claim:claims!market_claim_overrides_master_claim_id_fkey(*),
      replacement_claim:claims!market_claim_overrides_replacement_claim_id_fkey(*)
    `)
    .eq('target_product_id', productId)
    .eq('market_country_code', '__ALL_COUNTRIES__');

  if (globalOverrides.data) {
    for (const override of globalOverrides.data) {
      const masterClaimId = override.master_claim_id;
      
      if (override.is_blocked) {
        // Remove from all claim sets
        delete masterProductClaims[masterClaimId];
        delete masterIngredientClaims[masterClaimId];
        delete masterBrandClaims[masterClaimId];
        delete marketProductClaims[masterClaimId];
        delete marketIngredientClaims[masterClaimId];
        delete marketBrandClaims[masterClaimId];
        
        // Track as globally blocked
        overrideInfo[masterClaimId] = {
          overrideId: override.id,
          isBlocked: true,
          isGlobalOverride: true,
          marketCountryCode: '__ALL_COUNTRIES__',
          replacementClaim: null
        };
      }
      // ... handle replacement logic ...
    }
  }

  // Then check country-specific overrides (existing logic)
  // ... rest of the function ...
}
```

### Frontend Implementation

#### 1. UI Components

**New Component: `GlobalOverrideIndicator.tsx`**
```tsx
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
}

export function GlobalOverrideIndicator({ 
  size = 'md', 
  showLabel = true 
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
            className="bg-purple-100 text-purple-700 hover:bg-purple-200"
          >
            <Globe className={`${sizeClasses[size]} mr-1`} />
            {showLabel && 'Global'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This override applies to all countries</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**New Component: `GlobalOverrideWarning.tsx`**
```tsx
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
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Global Override Warning</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          This action will block the claim across {affectedCountries || 'all'} countries worldwide.
        </p>
        {existingOverrides.length > 0 && (
          <p className="text-sm">
            Note: Existing country-specific overrides in {existingOverrides.join(', ')} 
            will remain active and take precedence.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

#### 2. Override Management Page Updates

**File: `/src/app/dashboard/claims/overrides/page.tsx`**

```tsx
// Add state for global override mode
const [isGlobalOverride, setIsGlobalOverride] = useState(false);

// Update country selector section
<div className="space-y-4">
  <div className="flex items-center space-x-2">
    <Checkbox 
      id="global-override"
      checked={isGlobalOverride}
      onCheckedChange={(checked) => {
        setIsGlobalOverride(checked as boolean);
        if (checked) {
          setSelectedCountryCode('__ALL_COUNTRIES__');
        } else {
          setSelectedCountryCode('');
        }
      }}
      disabled={!canCreateGlobalOverrides}
    />
    <Label 
      htmlFor="global-override" 
      className="cursor-pointer font-medium"
    >
      Apply as Global Block (all countries)
    </Label>
  </div>

  {!isGlobalOverride && (
    <Select 
      value={selectedCountryCode} 
      onValueChange={setSelectedCountryCode}
      disabled={isLoadingCountries}
    >
      <SelectTrigger>
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

  {isGlobalOverride && (
    <GlobalOverrideWarning 
      affectedCountries={countries.length}
      existingOverrides={existingCountryOverrides}
    />
  )}
</div>

// Update override display table
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Product</TableHead>
      <TableHead>Market</TableHead>
      <TableHead>Master Claim Text</TableHead>
      <TableHead>Override Status</TableHead>
      <TableHead>Replacement Claim</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {overrides.map((override) => (
      <TableRow key={override.id}>
        <TableCell>{override.product.name}</TableCell>
        <TableCell>
          {override.market_country_code === '__ALL_COUNTRIES__' ? (
            <GlobalOverrideIndicator />
          ) : (
            <Badge variant="outline">
              {getCountryName(override.market_country_code)}
            </Badge>
          )}
        </TableCell>
        {/* ... rest of the cells ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 3. Claims Preview Matrix Updates

**File: `/src/app/dashboard/claims/preview/page.tsx`**

```tsx
// Update cell rendering to show global blocks
{cells.map((cell) => {
  const isGloballyBlocked = cell.globalOverride?.isBlocked;
  const hasCountryOverride = cell.marketOverride !== null;
  
  return (
    <td key={cell.claimId} className="relative">
      <div 
        className={cn(
          "p-3 cursor-pointer transition-colors min-h-[80px]",
          cell.isEffective && "bg-green-50",
          cell.marketOverride && "border-2 border-orange-400",
          isGloballyBlocked && "bg-purple-50 border-2 border-purple-400"
        )}
        onClick={() => handleCellClick(cell)}
      >
        {/* Global block indicator */}
        {isGloballyBlocked && (
          <div className="absolute top-1 right-1">
            <Globe className="h-4 w-4 text-purple-600" />
          </div>
        )}
        
        {/* Existing content */}
        <div className="text-xs">
          {cell.claimText}
        </div>
        
        {/* Warning if both global and country override exist */}
        {isGloballyBlocked && hasCountryOverride && (
          <div className="mt-1 text-xs text-orange-600">
            ⚠️ Country override active
          </div>
        )}
      </div>
    </td>
  );
})}
```

#### 4. Override Creation Modal Updates

**File: `/src/components/dashboard/overrides/override-form.tsx`**

```tsx
// Add confirmation dialog for global blocks
const handleSubmit = async (data: FormData) => {
  if (data.marketCountryCode === '__ALL_COUNTRIES__') {
    const confirmed = await confirm({
      title: 'Create Global Block?',
      description: `This will block "${masterClaim.claim_text}" across ALL countries. This action affects all markets worldwide.`,
      confirmText: 'Create Global Block',
      cancelText: 'Cancel',
      variant: 'destructive'
    });
    
    if (!confirmed) return;
  }
  
  // ... existing submit logic ...
};
```

### API Response Updates

#### Updated Types
```typescript
// types/api.ts
export interface MarketClaimOverrideInfo {
  overrideId: string;
  isBlocked: boolean;
  marketCountryCode: string;
  replacementClaim: Claim | null;
  // New fields
  isGlobalOverride?: boolean;
  affectedCountries?: string[];
  conflictingOverrides?: {
    countryCode: string;
    overrideId: string;
  }[];
}

export interface CreateOverrideResponse {
  success: boolean;
  data: MarketClaimOverride;
  warnings?: {
    existingOverrides?: string[];
    message?: string;
  };
}
```

### Permission Model

Add new permission check:
```typescript
// lib/auth/permissions.ts
export async function canCreateGlobalOverrides(
  userId: string,
  brandId: string
): Promise<boolean> {
  const role = await getUserBrandRole(userId, brandId);
  return role === 'admin' || role === 'manager';
}
```

### Testing Strategy

#### Unit Tests
```typescript
// __tests__/claims-utils.test.ts
describe('getStackedClaimsForProduct with global overrides', () => {
  it('should apply global override over country-specific claims', async () => {
    // Setup test data with global override
    const result = await getStackedClaimsForProduct(productId, 'US');
    expect(result.effectiveClaims).not.toContainEqual(
      expect.objectContaining({ id: blockedClaimId })
    );
  });

  it('should show global override in all countries', async () => {
    // Test multiple countries
    const countries = ['US', 'GB', 'FR', 'DE'];
    for (const country of countries) {
      const result = await getStackedClaimsForProduct(productId, country);
      expect(result.overrideInfo[claimId].isGlobalOverride).toBe(true);
    }
  });
});
```

#### Integration Tests
```typescript
// __tests__/api/market-overrides.test.ts
describe('POST /api/market-overrides with global blocks', () => {
  it('should create global override with proper permissions', async () => {
    const response = await request(app)
      .post('/api/market-overrides')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        masterClaimId: claim.id,
        marketCountryCode: '__ALL_COUNTRIES__',
        targetProductId: product.id,
        action: 'block'
      });
      
    expect(response.status).toBe(200);
    expect(response.body.data.market_country_code).toBe('__ALL_COUNTRIES__');
  });

  it('should reject global override without proper permissions', async () => {
    const response = await request(app)
      .post('/api/market-overrides')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        marketCountryCode: '__ALL_COUNTRIES__',
        // ...
      });
      
    expect(response.status).toBe(403);
  });
});
```

#### E2E Tests
```typescript
// e2e/global-overrides.spec.ts
test('create global override flow', async ({ page }) => {
  // Navigate to overrides page
  await page.goto('/dashboard/claims/overrides');
  
  // Select product
  await page.selectOption('[data-testid="product-select"]', productId);
  
  // Check global override checkbox
  await page.check('[data-testid="global-override-checkbox"]');
  
  // Verify warning appears
  await expect(page.locator('[data-testid="global-warning"]')).toBeVisible();
  
  // Create override
  await page.click('[data-testid="create-override-btn"]');
  
  // Confirm in dialog
  await page.click('[data-testid="confirm-global-block"]');
  
  // Verify success
  await expect(page.locator('[data-testid="global-override-indicator"]')).toBeVisible();
});
```

### Rollout Plan

#### Phase 1: Backend Implementation (Week 1)
1. Deploy database migration
2. Update API endpoints
3. Modify claims resolution logic
4. Deploy to staging

#### Phase 2: Frontend Implementation (Week 2)
1. Implement UI components
2. Update override management pages
3. Add visual indicators
4. Internal testing

#### Phase 3: Testing & Refinement (Week 3)
1. QA testing
2. Performance testing
3. User acceptance testing
4. Bug fixes

#### Phase 4: Production Release (Week 4)
1. Deploy to production
2. Monitor for issues
3. Gather user feedback
4. Document learnings

### Performance Considerations

1. **Index Usage**: The new index on `(master_claim_id, market_country_code)` WHERE `market_country_code = '__ALL_COUNTRIES__'` ensures fast lookups

2. **Query Optimization**: Global overrides are checked once per product, not per country

3. **Caching Strategy**: Consider caching global overrides at the application level since they change infrequently

### Security Considerations

1. **Permission Checks**: Only admin/manager roles can create global blocks
2. **Audit Trail**: All global actions are logged with user ID and timestamp
3. **Confirmation Dialogs**: Prevent accidental global blocks
4. **API Validation**: Strict validation of the special country code

### Monitoring & Analytics

Add tracking for:
- Number of global overrides created
- Users creating global overrides
- Most commonly blocked claims globally
- Time saved vs. country-by-country approach

### Future Enhancements

1. **Bulk Operations**: Select multiple claims to block globally
2. **Regional Blocks**: Block claims for specific regions (e.g., EU, APAC)
3. **Scheduled Blocks**: Set start/end dates for global blocks
4. **Override Templates**: Save common blocking patterns
5. **API for External Systems**: Allow programmatic global blocking

## Conclusion

This enhancement provides a powerful tool for global brand management while maintaining system integrity and user safety. The implementation leverages existing infrastructure, minimizes risk, and provides clear value to users managing claims across multiple markets.