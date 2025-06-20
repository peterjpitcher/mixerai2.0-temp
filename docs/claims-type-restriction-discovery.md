# Claims Type Restriction Discovery Report

## Executive Summary

This report details the changes needed to:
1. Restrict claims to only "allowed" or "disallowed" types (removing "mandatory" and "conditional")
2. Fix the claim creation logic to treat identical claims as one claim with multiple countries/products rather than creating separate database entries

## Current State Analysis

### 1. Claim Types Currently in System

#### Database Level
The `claim_type_enum` in the schema includes:
- `'allowed'` ✓
- `'disallowed'` ✓
- `'mandatory'` ❌ (to be removed)
- `'conditional'` ❌ (unused, to be removed)

#### Application Level
- **API**: Validates `['allowed', 'disallowed', 'mandatory']`
- **UI**: Shows "Allowed", "Mandatory", and "Disallowed" options
- **Note**: "Conditional" exists in DB but is never used in the application

### 2. Current Claim Creation Behavior

The system currently creates **separate database rows** for each claim-country-product combination:

```
Example: 1 claim text + 3 countries = 3 separate rows in claims table
```

This is inefficient and causes the UI to show duplicate claims. The database has junction tables (`claim_products`, `claim_countries`) that were designed to solve this but aren't being used properly.

## Required Changes

### Phase 1: Database Changes

#### 1.1 Migration to Update Enum Type
```sql
-- Migration: 20250120_restrict_claim_types.sql

-- Step 1: Update existing claims
UPDATE claims 
SET claim_type = 'allowed' 
WHERE claim_type = 'mandatory';

-- Step 2: Create new enum without mandatory/conditional
CREATE TYPE claim_type_enum_new AS ENUM ('allowed', 'disallowed');

-- Step 3: Update columns to use new enum
ALTER TABLE claims 
  ALTER COLUMN claim_type TYPE claim_type_enum_new 
  USING claim_type::text::claim_type_enum_new;

-- Step 4: Drop old enum and rename new one
DROP TYPE claim_type_enum;
ALTER TYPE claim_type_enum_new RENAME TO claim_type_enum;

-- Step 5: Update any functions that reference the enum
-- (Need to check for stored procedures/functions)
```

#### 1.2 Migration to Consolidate Duplicate Claims
```sql
-- Migration: 20250120_consolidate_duplicate_claims.sql

-- This migration will:
-- 1. Identify duplicate claims (same text, type, level, entity)
-- 2. Keep one master claim
-- 3. Populate junction tables with all countries/products
-- 4. Delete the duplicate rows
```

### Phase 2: API Changes

#### 2.1 Update Type Definitions

**File**: `/src/app/api/claims/route.ts`
```typescript
// Change from:
type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory';

// To:
type ClaimTypeEnum = 'allowed' | 'disallowed';
```

#### 2.2 Update Validation Schemas
```typescript
// Update both schemas:
const dbClaimSchema = z.object({
  claim_type: z.enum(['allowed', 'disallowed']), // Remove 'mandatory'
  // ... rest of schema
});

const requestBodySchema = z.object({
  claim_type: z.enum(['allowed', 'disallowed']), // Remove 'mandatory'
  // ... rest of schema
});
```

#### 2.3 Implement Junction Table Usage

Replace the current claim creation logic with:
```typescript
// Instead of creating multiple claims, create one claim with associations
const { data: claimId } = await supabase.rpc('create_claim_with_associations', {
  p_claim_text: claim_text,
  p_claim_type: claim_type,
  p_level: level,
  p_master_brand_id: master_brand_id,
  p_ingredient_id: ingredient_id,
  p_product_ids: product_ids,
  p_country_codes: country_codes,
  p_description: description,
  p_created_by: user.id,
  p_workflow_id: workflow_id
});
```

### Phase 3: Frontend Changes

#### 3.1 Update Claim Form Components

**Files to update**:
- `/src/components/dashboard/claims/ClaimDefinitionFormV2.tsx`
- `/src/components/dashboard/claims/ClaimDefinitionForm.tsx`

Remove the "Mandatory" option:
```tsx
// Remove this SelectItem:
<SelectItem value="mandatory">
  <div>
    <div className="font-medium text-blue-600">Mandatory</div>
    <div className="text-xs text-muted-foreground">Must be included in relevant content</div>
  </div>
</SelectItem>
```

#### 3.2 Update Display Components

**Files to check**:
- Claims list pages
- Claim detail views
- Claims formatter (`/src/lib/claims-formatter.ts`)

Remove any logic that handles "mandatory" claims differently.

#### 3.3 Update Icons/Badges

The claim type icons need updating:
```typescript
// Current:
const claimTypeIcons = {
  allowed: () => <ShieldCheck className="..." />,
  disallowed: () => <ShieldOff className="..." />,
  mandatory: () => <ShieldAlert className="..." />, // Remove this
  conditional: () => <ShieldQuestion className="..." />, // Remove this
};
```

### Phase 4: Data Migration Strategy

#### 4.1 Handle Existing Mandatory Claims
Options:
1. Convert all "mandatory" claims to "allowed" (recommended)
2. Convert all "mandatory" claims to "disallowed"
3. Review each mandatory claim individually (manual process)

#### 4.2 Consolidate Duplicate Claims
1. Group claims by (claim_text, claim_type, level, entity_id)
2. For each group:
   - Keep the oldest claim as the master
   - Collect all unique country_codes and product_ids
   - Populate junction tables
   - Delete duplicates

### Phase 5: Testing Requirements

1. **Database Tests**:
   - Verify enum type change doesn't break existing queries
   - Ensure junction tables are properly populated
   - Check foreign key constraints still work

2. **API Tests**:
   - Creating claims with only allowed/disallowed types
   - Verify old "mandatory" type is rejected
   - Test claim creation uses junction tables

3. **UI Tests**:
   - Form only shows two claim type options
   - Existing mandatory claims display correctly
   - Claims list shows consolidated claims (not duplicates)

## Implementation Order

1. **First**: Create and run database migrations
2. **Second**: Update API validation and logic
3. **Third**: Update frontend components
4. **Fourth**: Run data consolidation migration
5. **Finally**: Deploy and monitor

## Risks and Mitigations

### Risk 1: Breaking Existing Integrations
- **Mitigation**: Add backward compatibility layer that converts "mandatory" to "allowed" during transition period

### Risk 2: Data Loss During Migration
- **Mitigation**: Create comprehensive backup before migration, test on staging first

### Risk 3: Performance Impact
- **Mitigation**: Run consolidation migration during low-traffic period, use batched updates

## Benefits

1. **Simplified System**: Fewer claim types = less complexity
2. **Better Performance**: Using junction tables reduces data duplication
3. **Improved UX**: No duplicate claims in the UI
4. **Cleaner Data Model**: Normalized structure using junction tables

## Next Steps

1. Review and approve this discovery document
2. Create detailed migration scripts
3. Test migrations on development environment
4. Schedule production deployment