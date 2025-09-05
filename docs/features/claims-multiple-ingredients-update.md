# Claims Multiple Ingredients Update

## Overview

This update enables claims to be associated with multiple ingredients, similar to how claims can already be associated with multiple products and countries. This change uses junction tables for proper many-to-many relationships.

## Database Changes

### 1. New Junction Table
Created `claim_ingredients` table to support many-to-many relationships between claims and ingredients:
```sql
CREATE TABLE claim_ingredients (
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (claim_id, ingredient_id)
);
```

### 2. Migration File
- **File**: `/supabase/migrations/20250120_add_claim_ingredients_junction.sql`
- **Features**:
  - Creates the junction table with proper indexes
  - Adds RLS policies matching claim_products
  - Migrates existing single-ingredient claims to junction table
  - Updates views and functions to support ingredient arrays
  - Maintains backward compatibility

### 3. Updated Functions
- `get_claim_ingredients(claim_uuid)` - Returns array of ingredient IDs for a claim
- `create_claim_with_associations()` - Updated to accept `p_ingredient_ids` array parameter
- `claims_with_arrays` view - Now includes `ingredient_ids` array and `ingredient_names` concatenated string

## API Changes

### 1. Updated Schema
- Added `ingredient_ids` array field to request body schema
- Kept `ingredient_id` for backward compatibility
- Updated validation to accept either field for ingredient claims

### 2. New Claim Creation Logic
- Replaced direct insert with `create_claim_with_associations` RPC call
- Creates single claim with junction table associations
- Eliminates duplicate claim rows for same claim text

### 3. Response Format
- Returns single claim ID instead of array of claims
- Includes success message about associations
- Simplified error handling

## Frontend Changes

### 1. ClaimDefinitionFormV2 Component
- Changed from single `Select` to `MultiSelectCheckboxCombobox` for ingredients
- Updated state from `selectedIngredient` to `selectedIngredientValues` array
- Form now submits `ingredient_ids` array instead of single `ingredient_id`
- Maintains backward compatibility when loading existing claims

### 2. User Experience
- Users can now select multiple ingredients per claim
- Interface matches the multi-select pattern used for products
- Clear labeling as "Ingredients" (plural) in the form

## Benefits

1. **Data Consistency**: One claim record with multiple associations instead of duplicate rows
2. **Performance**: Better query performance using junction tables
3. **Flexibility**: Claims can now apply to ingredient combinations
4. **User Experience**: Simplified claim management without duplicates
5. **Future-Proof**: Extensible pattern for other many-to-many relationships

## Migration Notes

- Existing single-ingredient claims are automatically migrated to use junction table
- The `ingredient_id` column on claims table is deprecated but kept for compatibility
- New claims should use `ingredient_ids` array in API calls
- Frontend forms have been updated to use multi-select

## Testing Checklist

1. ✓ Create new ingredient claim with multiple ingredients
2. ✓ Verify junction table is populated correctly
3. ✓ Check that claims list shows consolidated claims (not duplicates)
4. ✓ Test backward compatibility with existing single-ingredient claims
5. ✓ Verify RLS policies work correctly
6. ✓ Test claim creation via API with ingredient_ids array