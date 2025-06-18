# Database Schema Review - MixerAI 2.0

**Date**: December 2024  
**Scope**: All database migrations and schema design  
**Critical**: Immediate action required for data integrity and security issues

## Executive Summary

The database schema shows signs of rapid evolution with significant technical debt. Critical issues include overuse of JSONB columns bypassing constraints, overly permissive RLS policies, missing indexes for common queries, and no data validation at the database level.

## 1. Schema Design Issues

### JSONB Overuse (Critical)
The schema heavily relies on JSONB columns, bypassing database integrity:

```sql
-- Problem: No validation on structure
content_data JSONB,
fields JSONB,
steps JSONB,
details JSONB,
user_metadata JSONB,
brand_metadata JSONB
```

**Impact**: 
- No data validation at DB level
- Can't use foreign keys into JSONB
- Poor query performance
- Data inconsistency risks

### Missing NOT NULL Constraints
Critical fields lacking constraints:
```sql
-- These should be NOT NULL:
brands.name TEXT,              -- Brand must have name
users.email TEXT,              -- User must have email  
content.title TEXT,            -- Content must have title
workflows.name TEXT,           -- Workflow must have name
```

### Text Fields Without Limits
Unbounded TEXT columns risk data explosion:
```sql
content.body TEXT,             -- Could be gigabytes
claims.claim_text TEXT,        -- No max length
brands.description TEXT,       -- No limit
```

**Solution needed**:
```sql
ALTER TABLE content ADD CONSTRAINT check_body_length 
  CHECK (length(body) <= 1000000); -- 1MB limit
```

### Inconsistent Naming
```sql
-- Timestamp naming
created_at      -- Standard
invited_at      -- Different pattern
last_sign_in_at -- Yet another pattern

-- User references
user_id         -- In some tables
created_by      -- In others
assigned_to     -- In others
```

## 2. Data Integrity Problems

### Circular Dependencies
The claims table has a problematic design:
```sql
-- Claims can reference products OR ingredients OR master claims
master_claim_brand_id UUID REFERENCES master_claim_brands(id),
product_id UUID,  -- Deprecated but still exists
ingredient_id UUID,
-- CHECK constraint requires at least one
```

**Issues**:
- Complex validation logic
- Difficult to maintain referential integrity
- Query complexity increases

### Missing Composite Unique Constraints
```sql
-- These should be unique:
-- Product names within a brand
ALTER TABLE products ADD CONSTRAINT unique_product_brand_name 
  UNIQUE (brand_id, name);

-- Workflow names within a brand  
ALTER TABLE workflows ADD CONSTRAINT unique_workflow_brand_name
  UNIQUE (brand_id, name);

-- Template names globally
ALTER TABLE content_templates ADD CONSTRAINT unique_template_name
  UNIQUE (name);
```

### Orphaned Data Risks
```sql
-- content.created_by SET NULL on delete loses audit trail
created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

-- Should be:
created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
deleted_by UUID REFERENCES auth.users(id), -- Soft delete instead
```

### No Version Control Validation
```sql
-- No constraint ensuring version order
ALTER TABLE content ADD CONSTRAINT check_version_order
  CHECK (published_version IS NULL OR published_version <= version);
```

## 3. Performance Issues

### Missing Critical Indexes
```sql
-- High-impact missing indexes:
CREATE INDEX idx_content_brand_status_created 
  ON content(brand_id, status, created_at DESC);

CREATE INDEX idx_notifications_user_unread 
  ON notifications(user_id, is_read) 
  WHERE is_read = false;

CREATE INDEX idx_workflow_tasks_assignee_pending
  ON workflow_tasks(assigned_to, completed)
  WHERE completed = false;

CREATE INDEX idx_claims_brand_status
  ON claims(master_claim_brand_id, status);
```

### JSONB Query Performance
```sql
-- No GIN indexes for JSONB queries
CREATE INDEX idx_content_data_gin ON content USING gin (content_data);
CREATE INDEX idx_template_fields_gin ON content_templates USING gin (fields);
CREATE INDEX idx_tool_params_gin ON tool_run_history USING gin (input_params);
```

### Large Column Storage
```sql
-- These columns are fetched with SELECT * but rarely needed:
content.body TEXT,                    -- Large HTML
content_data JSONB,                   -- Complex nested data
tool_run_history.output_result JSONB, -- AI responses
```

**Solution**: Move to separate tables or use column exclusion.

### No Partitioning Strategy
Tables that will grow unboundedly:
- content (by created_at)
- analytics_events (by timestamp)  
- tool_run_history (by created_at)
- notifications (by created_at)

## 4. Security Vulnerabilities

### Overly Permissive RLS Policies

**Critical - Data Exposure**:
```sql
-- Allows ANYONE to view ALL brands
CREATE POLICY "Users can view brands" ON brands
  FOR SELECT USING (true);

-- Allows viewing ALL templates
CREATE POLICY "Users can view content templates" ON content_templates
  FOR SELECT USING (true);

-- Exposes ALL claims data
CREATE POLICY "Enable read access for all users" ON claims
  FOR SELECT USING (true);
```

**Should be**:
```sql
-- Limit to user's assigned brands
CREATE POLICY "Users can view assigned brands" ON brands
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM brand_users WHERE brand_id = brands.id
    )
  );
```

### Service Role Bypass
Many operations use service role, completely bypassing RLS:
```sql
-- This makes RLS policies meaningless:
const supabaseAdmin = createClient(url, serviceRoleKey);
```

### Missing Audit Columns
No comprehensive audit trail:
```sql
-- Should have on all tables:
created_by UUID NOT NULL REFERENCES auth.users(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_by UUID REFERENCES auth.users(id),
updated_at TIMESTAMPTZ,
deleted_by UUID REFERENCES auth.users(id),
deleted_at TIMESTAMPTZ
```

### Unencrypted Sensitive Data
```sql
-- PII stored in plain text:
users.email TEXT,
profiles.full_name TEXT,
workflow_invitations.token TEXT, -- Should be hashed
```

## 5. Business Logic Issues

### No State Machine Constraints
```sql
-- Workflow status transitions not enforced
ALTER TABLE workflows ADD CONSTRAINT valid_status_transition
  CHECK (
    (status = 'active' AND previous_status IN ('draft', 'archived')) OR
    (status = 'archived' AND previous_status IN ('active', 'draft')) OR
    (status = 'draft')
  );
```

### Missing Field Validation
The `check_fields_structure` function only validates presence, not content:
```sql
-- Current: Only checks keys exist
-- Needed: Validate field types, required fields, value constraints
CREATE OR REPLACE FUNCTION validate_template_fields(fields JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check each field has required properties
  -- Validate field types are valid
  -- Ensure constraints are met
  RETURN true;
END;
$$ LANGUAGE plpgsql;
```

### Workflow Integrity
No guarantee of contiguous step orders:
```sql
-- Could have gaps: steps 1, 3, 5
ALTER TABLE workflow_steps ADD CONSTRAINT contiguous_step_order
  CHECK (/* complex logic needed */);
```

## 6. Anti-Patterns Identified

### God Object: Content Table
The content table handles too many responsibilities:
- Content storage
- Versioning
- Workflow state
- Publishing state
- Analytics metadata

**Solution**: Split into focused tables.

### EAV Pattern via JSONB
Using JSONB for dynamic fields is essentially EAV:
```sql
-- Current:
content_data JSONB -- Contains any structure

-- Better:
content_fields (
  content_id UUID,
  field_name TEXT,
  field_value TEXT,
  field_type TEXT
)
```

### Polymorphic Foreign Keys
Claims table with multiple optional references:
```sql
-- Anti-pattern:
master_claim_brand_id UUID,
product_id UUID,  
ingredient_id UUID,
CHECK (num_nonnulls(...) >= 1)

-- Better: Use inheritance or separate tables
```

## 7. Immediate Actions Required

### 1. Add Missing Constraints
```sql
-- NOT NULL constraints
ALTER TABLE brands ALTER COLUMN name SET NOT NULL;
ALTER TABLE workflows ALTER COLUMN name SET NOT NULL;
ALTER TABLE content ALTER COLUMN title SET NOT NULL;

-- Unique constraints  
ALTER TABLE products ADD CONSTRAINT unique_product_brand_sku 
  UNIQUE (brand_id, sku);

-- Check constraints
ALTER TABLE content ADD CONSTRAINT check_version_order
  CHECK (published_version IS NULL OR published_version <= version);
```

### 2. Create Missing Indexes
```sql
-- Performance critical
CREATE INDEX CONCURRENTLY idx_content_brand_status 
  ON content(brand_id, status);

CREATE INDEX CONCURRENTLY idx_notifications_user_unread 
  ON notifications(user_id, is_read) 
  WHERE is_read = false;
```

### 3. Fix RLS Policies
```sql
-- Revoke overly permissive policies
DROP POLICY "Users can view brands" ON brands;

-- Create proper policies
CREATE POLICY "Users view assigned brands" ON brands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brand_users 
      WHERE brand_id = brands.id 
      AND user_id = auth.uid()
    )
  );
```

### 4. Add Audit Triggers
```sql
-- Audit trigger for all tables
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 8. Migration Strategy

### Phase 1: Critical Fixes (Week 1)
1. Add missing indexes
2. Add NOT NULL constraints
3. Fix RLS policies
4. Add check constraints

### Phase 2: Schema Cleanup (Month 1)
1. Remove deprecated columns
2. Standardize naming conventions
3. Add composite unique constraints
4. Implement audit columns

### Phase 3: Architecture (Quarter)
1. Split god objects
2. Implement partitioning
3. Add event sourcing
4. Migrate from JSONB to structured data

## Success Metrics

- Query performance: All queries < 100ms
- Data integrity: 0 constraint violations
- Security: No unauthorized data access
- Maintenance: 50% reduction in schema complexity

## Conclusion

The database schema requires immediate attention to address critical security vulnerabilities and performance issues. The overuse of JSONB columns and overly permissive RLS policies pose the highest risk. Implementing the recommended constraints and indexes will significantly improve data integrity and application performance.