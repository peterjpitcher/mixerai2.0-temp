# Claims Schema Update Summary

## Overview
All claims-related pages and components have been updated to match the current database schema where:
- `claim_type_enum` is restricted to only 'allowed' and 'disallowed' (removed 'mandatory' and 'conditional')
- Claims use junction tables for many-to-many relationships
- Multiple ingredients can be associated with a single claim

## Changes Made

### 1. Database Schema (Already Applied)
- **claim_type_enum**: Now only has 'allowed' and 'disallowed' values
- **Junction Tables**: 
  - `claim_products` - for multiple products per claim
  - `claim_countries` - for multiple countries per claim  
  - `claim_ingredients` - for multiple ingredients per claim
- **View**: `claims_with_arrays` includes `ingredient_ids` array
- **Functions**: `get_claim_ingredients()` helper function added

### 2. Frontend Updates

#### Main Claims Page (`/src/app/dashboard/claims/page.tsx`)
- ✅ Updated `ClaimTypeEnum` type to only include 'allowed' and 'disallowed'
- ✅ Removed icons for 'mandatory' and 'conditional' claim types
- ✅ Removed 'Mandatory' from filter dropdown
- ✅ Updated Claim interface to support arrays from junction tables
- ✅ Updated enrichedClaims logic to handle multiple products/ingredients

#### Claims API Route (`/src/app/api/claims/route.ts`)
- ✅ Updated TypeScript interfaces to remove 'mandatory' from claim_type
- ✅ Updated Zod validation schemas
- ✅ Route already uses `create_claim_with_associations` RPC function

#### Claim Definition Form (`/src/components/dashboard/claims/ClaimDefinitionFormV2.tsx`)
- ✅ Removed 'Mandatory' option from claim type dropdown
- ✅ Already supports multiple ingredients selection

#### Claims Types (`/src/types/claims.ts`)
- ✅ Removed `mandatory_claims` from `StyledClaims` interface

#### Claims Formatter (`/src/lib/claims-formatter.ts`)
- ✅ Updated `RawClaim` type to remove 'mandatory'
- ✅ Removed mandatory claims formatting logic

#### Brand Review Page (`/src/app/dashboard/claims/brand-review/page.tsx`)
- ✅ Removed `MandatoryClaim` interface
- ✅ Updated `StyledClaimsData` interface
- ✅ Removed mandatory claims display section

#### Claims Viewer Component (`/src/components/content/claims-viewer-section.tsx`)
- ✅ Updated claims count display
- ✅ Removed mandatory claims section

#### Style Brand Claims API (`/src/app/api/ai/style-brand-claims/route.ts`)
- ✅ Updated Claim type to remove 'mandatory'
- ✅ Removed mandatory claims sorting logic

## Current State

All claims pages now properly connect to the updated database schema:
1. Only 'allowed' and 'disallowed' claim types are supported
2. Claims can have multiple products, countries, and ingredients
3. The UI properly displays multi-entity claims
4. No references to 'mandatory' or 'conditional' claims remain

## Migration Notes

- Existing claims with 'mandatory' type were converted to 'allowed' in the database
- The 9 'conditional' claims were also converted to 'allowed'
- All pages gracefully handle backward compatibility with single entity claims

## Testing Recommendations

1. Create new claims with multiple ingredients
2. Verify existing claims display correctly
3. Test filtering by claim type (only allowed/disallowed)
4. Verify brand review page displays claims without mandatory section
5. Check that claim creation uses junction tables properly