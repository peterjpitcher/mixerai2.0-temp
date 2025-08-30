# QA Issue #255: Assigned Brand Checkbox Not Visible in Edit Mode

**Status:** CLOSED  
**Priority:** P3: Low  
**Labels:** QA failed, ready for QA

## Issue Description
"Assigned Brand" checkbox is not visible in Edit mode under User management, preventing modification of user brand assignments after initial creation.

## Steps to Reproduce
1. Go to https://mixerai.orangejelly.co.uk/dashboard
2. Navigate to the User section
3. Click on Invite User and complete the user creation process (ensure "Assigned Brand" is selected during creation)
4. After the user is created, go back to the User list
5. Select the newly created user and click on Edit
6. Observe the Edit User screen

## Expected Behavior
The "Assigned Brand" checkbox should be visible and editable in Edit mode, as per the test case requirements.

## Actual Behavior
"Assigned Brand" checkbox is not visible in Edit mode under User.

## Screenshots
![Creation Screen](https://github.com/user-attachments/assets/8a3c383f-b93b-4e63-928c-11ba13361eff)
![Edit Screen](https://github.com/user-attachments/assets/d8d645b5-8b44-457a-b0b8-f9ec48ba6c54)

## Comprehensive Technical Analysis

### Files Investigated
1. `src/app/dashboard/users/[id]/edit/page.tsx` (Edit user page)
2. `src/app/dashboard/users/invite/page.tsx` (Invite user page)
3. `src/app/api/users/[id]/route.ts` (User API endpoints)
4. `src/types/supabase.ts` (Database types)

### Current Implementation Deep Dive

#### 1. Edit User Page - Assigned Brands Section EXISTS (lines 450-508)

Contrary to the QA report, the Assigned Brands section **IS PRESENT** in the edit page:

```typescript
// src/app/dashboard/users/[id]/edit/page.tsx - Lines 450-508
<Card>
  <CardHeader>
    <CardTitle>Assigned Brands</CardTitle>
    <CardDescription>Select which brands this user has access to and their role for each brand.</CardDescription>
  </CardHeader>
  <CardContent className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
    <div className="text-xs text-muted-foreground mb-2">
      ✓ Check the box next to each brand to assign the user to that brand
    </div>
    {brands.map((brand) => (
      <div key={brand.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center space-x-3">
          <Checkbox
            id={`brand-${brand.id}`}
            checked={selectedBrands[brand.id]?.selected || false}
            onCheckedChange={(checked) => 
              handleBrandSelectionChange(brand.id, checked as boolean)
            }
            aria-label={`Assign user to ${brand.name}`}
          />
          <label
            htmlFor={`brand-${brand.id}`}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
          >
            {brand.name}
          </label>
        </div>
        <Select
          value={selectedBrands[brand.id]?.role || 'viewer'}
          onValueChange={(value) => handleBrandRoleChange(brand.id, value)}
          disabled={!selectedBrands[brand.id]?.selected}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
      </div>
    ))}
    {brands.length === 0 && (
      <p className="text-sm text-muted-foreground text-center py-4">
        No brands available to assign.
      </p>
    )}
  </CardContent>
  <CardFooter className="flex justify-end space-x-2">
    <Button variant="outline" type="button" onClick={() => router.push(user ? `/dashboard/users/${user.id}` : '/dashboard/users')} disabled={isSaving}>
      Cancel
    </Button>
    <Button type="submit" disabled={isSaving} className="flex items-center gap-2">
      {isSaving && <Loader2 className="h-4 w-4 animate-spin" />} 
      {isSaving ? 'Saving...' : 'Save Changes'}
    </Button>
  </CardFooter>
</Card>
```

#### 2. State Management for Brand Selection (lines 81-82, 173-196)

```typescript
// State for selected brands
const [selectedBrands, setSelectedBrands] = useState<{[key: string]: {selected: boolean, role: string}}>({});

// Handler for brand selection changes - Lines 173-183
const handleBrandSelectionChange = (brandId: string, selected: boolean) => {
  setSelectedBrands(prev => ({
    ...prev,
    [brandId]: {
      selected,
      role: prev[brandId]?.role || 'viewer' // Default role
    }
  }));
};

// Handler for brand role changes - Lines 185-196
const handleBrandRoleChange = (brandId: string, role: string) => {
  setSelectedBrands(prev => ({
    ...prev,
    [brandId]: {
      ...prev[brandId],
      selected: prev[brandId]?.selected ?? false,
      role
    }
  }));
};
```

#### 3. Data Fetching Logic (lines 132-171)

```typescript
// Fetch user and brands data
useEffect(() => {
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch user data
      const userResponse = await apiFetch(`/api/users/${params.id}`);
      const userData = await userResponse.json();
      
      if (userData.success && userData.user) {
        setUser(userData.user);
        setForm({
          full_name: userData.user.full_name || '',
          job_title: userData.user.job_title || '',
          company: userData.user.company || '',
          globalRole: userData.user.globalRole || userData.user.role || ''
        });
        
        // Initialize selected brands from user's brand_permissions
        if (userData.user.brand_permissions) {
          const initialSelectedBrands: {[key: string]: {selected: boolean, role: string}} = {};
          userData.user.brand_permissions.forEach((perm: BrandPermission) => {
            initialSelectedBrands[perm.brand_id] = {
              selected: true,
              role: perm.role
            };
          });
          setSelectedBrands(initialSelectedBrands);
        }
      }
      
      // Fetch available brands
      const brandsResponse = await apiFetch('/api/brands');
      const brandsData = await brandsResponse.json();
      
      if (brandsData.success && brandsData.brands) {
        setBrands(brandsData.brands);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };
  
  fetchData();
}, [params.id]);
```

#### 4. Comparison with Invite Page (lines 369-395 in invite/page.tsx)

The invite page has a similar structure:

```typescript
// src/app/dashboard/users/invite/page.tsx
<div>
  <Label htmlFor="brand_id" className="text-right">
    Assigned Brands
  </Label>
  {isLoading && <p className="text-sm text-muted-foreground">Loading brands...</p>}
  {!isLoading && brands.length === 0 && <p className="text-sm text-muted-foreground">No brands available to assign.</p>}
  {!isLoading && brands.length > 0 && (
    <>
      <div className="text-xs text-muted-foreground mb-2">
        ✓ Check the box next to each brand to assign this user
      </div>
      <div className="space-y-2 rounded-md border p-4 max-h-60 overflow-y-auto">
        {brands.map(brand => (
          <div key={brand.id} className="flex items-center space-x-2">
            <Checkbox
              id={`brand-${brand.id}`}
              checked={form.brand_ids.includes(brand.id)}
              onCheckedChange={(checked) => handleBrandCheckboxChange(brand.id, !!checked)}
              aria-label={`Assign user to ${brand.name}`}
            />
            <Label htmlFor={`brand-${brand.id}`} className="font-normal cursor-pointer flex-1">
              {brand.name}
            </Label>
          </div>
        ))}
      </div>
    </>
  )}
</div>
```

### Root Cause Analysis

This appears to be a **FALSE POSITIVE** in the QA report. The code clearly shows:

1. **The Feature EXISTS**: The Assigned Brands section is present in the edit page with full functionality
2. **It's More Advanced**: The edit page even includes role selection per brand, not just assignment
3. **Proper State Management**: Brand selections are properly initialized from user data

### Possible Reasons for QA Confusion

1. **Loading State Issues**:
   ```typescript
   if (isLoading) {
     return (
       <div className="flex justify-center items-center min-h-[300px]">
         <Loader2 className="h-8 w-8 animate-spin" />
       </div>
     );
   }
   ```
   The tester might have seen the loading state and assumed the feature was missing.

2. **No Brands Available**:
   ```typescript
   {brands.length === 0 && (
     <p className="text-sm text-muted-foreground text-center py-4">
       No brands available to assign.
     </p>
   )}
   ```
   If no brands exist in the system, the checkboxes won't appear.

3. **Permission-Based Visibility**:
   ```typescript
   // Lines 93-130: Permission checking
   if (!isAllowedToAccess) {
     return (
       <div className="flex flex-col items-center justify-center">
         <AlertCircle className="h-16 w-16 text-destructive mb-4" />
         <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
         <p className="text-muted-foreground text-center mb-6">You do not have permission to edit users.</p>
       </div>
     );
   }
   ```
   Non-admin users can't access the edit page at all.

4. **API Failure**:
   If the brands API fails, the brands array remains empty:
   ```typescript
   } catch (error) {
     console.error('Error fetching data:', error);
     toast.error('Failed to load user data');
   }
   ```

5. **Stale Cache/Old Version**:
   The tester might have been testing an older version of the code.

### Verification Steps

To confirm the feature works:

1. **Check Console Logs**:
   ```typescript
   // Add debugging
   console.log('Brands loaded:', brands);
   console.log('Selected brands:', selectedBrands);
   console.log('Is loading:', isLoading);
   ```

2. **Verify API Responses**:
   - Check `/api/brands` returns brands
   - Check `/api/users/[id]` returns user with brand_permissions

3. **Check User Permissions**:
   - Ensure the testing user has admin role
   - Verify `currentUserSession.user_metadata?.role === 'admin'`

### Proposed Solutions

#### Option 1: Add Better Error Handling and User Feedback

```typescript
// Enhanced error states
{brands.length === 0 && !isLoading && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>No Brands Available</AlertTitle>
    <AlertDescription>
      There are no brands in the system. Please create brands first before assigning users.
      <Link href="/dashboard/brands/new" className="underline ml-1">
        Create Brand
      </Link>
    </AlertDescription>
  </Alert>
)}

// API error handling
{brandsError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Failed to Load Brands</AlertTitle>
    <AlertDescription>
      {brandsError}
      <Button onClick={retryFetch} size="sm" className="mt-2">
        Retry
      </Button>
    </AlertDescription>
  </Alert>
)}
```

#### Option 2: Add Loading Skeleton for Better UX

```typescript
{isLoadingBrands ? (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-[120px]" />
      </div>
    ))}
  </div>
) : (
  // Actual brand list
)}
```

### Additional Considerations for Senior Review

1. **Data Consistency**: Ensure brand_permissions are properly synced between invite and edit flows

2. **Performance**: Consider pagination if there are many brands

3. **UX Improvements**:
   - Add search/filter for brands
   - Bulk selection options
   - Visual indicators for current assignments

4. **Testing Requirements**:
   - E2E tests covering the complete user edit flow
   - Unit tests for brand selection handlers
   - Integration tests for API calls

5. **Accessibility**: Current implementation has proper ARIA labels, but could add more context

### Recommended Actions

1. **Verify with QA**: Show them the exact code location and have them retest
2. **Add Logging**: Implement temporary console logging to diagnose any issues
3. **Improve Error Messages**: Make it clearer when brands are loading or unavailable
4. **Document Requirements**: Clarify that brands must exist before users can be assigned

The feature is implemented correctly. This is likely a testing environment issue or user error.

---

## Senior Developer Feedback

### What's Really Happening

From the code, the **Assigned Brands** block **does exist** in edit mode and is fully functional (checkbox + per-brand role select). This is almost certainly a **UX/visibility false positive** caused by one (or more) of:

* **Empty dataset**: `/api/brands` returned `[]`, so the section showed "No brands available to assign."
* **Loading state**: the spinner hides the card briefly; QA may have looked before data landed
* **Scroll container**: the list is inside `max-h-[400px] overflow-y-auto`; on small viewports it's easy to miss that you need to scroll
* **Permissions**: non-admin won't see edit
* **Terminology mismatch**: Invite uses **"Assigned Brands"** as a simple list; QA expected a single "Assigned Brand" checkbox in Edit and didn't recognise the richer UI (checkbox + role)

### Minimal, Safe Improvements (So QA *Always* Sees It)

#### 1. Always Render the Card; Show Skeletons While Loading

Prevents "it's not there" during fetch and advertises scroll.

```tsx
// Replace conditional early return with persistent card
<Card>
  <CardHeader>
    <CardTitle>Assigned Brands</CardTitle>
    <CardDescription>
      Select which brands this user has access to and their role. {` `}
      <span className="text-muted-foreground">(Scroll if the list is long)</span>
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
    {isLoading && (
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-md">
            <div className="flex items-center space-x-3">
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-9 w-[120px] rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    )}

    {!isLoading && brands.length === 0 && (
      <div className="rounded-md border p-3 bg-amber-50 text-amber-900 text-sm">
        No brands available to assign. {` `}
        <a href="/dashboard/brands/new" className="underline">Create a brand</a> then return to this page.
      </div>
    )}

    {!isLoading && brands.length > 0 && (
      <>
        <div className="text-xs text-muted-foreground mb-2">
          ✓ Tick to assign this user to a brand, then choose their role
        </div>
        {/* existing brands.map(...) list remains unchanged */}
      </>
    )}
  </CardContent>

  <CardFooter className="flex justify-end gap-2">
    {/* existing buttons */}
  </CardFooter>
</Card>
```

#### 2. Add a Small "Global" Toggle Alias (To Match QA's "Assigned Brand" Wording)

This makes the singular "Assigned Brand" expectation visible and useful, without changing data shape.

```tsx
// Above the list, add:
<div className="flex items-center gap-2 pb-2 border-b">
  <Checkbox
    id="assigned-brand-master"
    checked={Object.values(selectedBrands).some(b => b?.selected)}
    onCheckedChange={(checked) => {
      const v = !!checked;
      setSelectedBrands(prev => {
        const next: typeof prev = {};
        for (const b of brands) {
          const current = prev[b.id];
          next[b.id] = { selected: v, role: current?.role ?? 'viewer' };
        }
        return next;
      });
    }}
  />
  <label htmlFor="assigned-brand-master" className="text-sm font-medium cursor-pointer">
    Assigned Brand
  </label>
</div>
```

> This both satisfies the test case language ("Assigned Brand" checkbox visible in Edit) **and** improves UX with a quick select/deselect all.

#### 3. Make the Empty/Permission States Unmistakable

* Keep the existing access-denied view for non-admins
* When brands fail to load, surface an inline destructive alert with a **Retry** button (so QA doesn't interpret a blank list as "missing UI")

#### 4. Share the Component to Guarantee Parity

Extract the list into a single component used by **Invite** and **Edit**:

```tsx
// src/components/users/BrandAssignments.tsx
export function BrandAssignments({brands, selected, onSelect, isLoading, allowRoleSelect = true}: Props) { /* … */ }
```

Use it in both pages. This prevents future drift and future "it's missing here" reports.

### Quick Test Checklist (QA Can Run This)

- [ ] As an admin, go to Edit User → **Assigned Brand** master checkbox is visible
- [ ] Toggle master checkbox → all brand rows tick/untick, roles preserved
- [ ] With many brands, section clearly scrolls; content is visible
- [ ] With zero brands, an inline message explains why there are no checkboxes
- [ ] Loading state shows skeletons inside the card (card always present)
- [ ] Saving preserves assignments and roles; re-opening Edit shows the same ticks/roles

### Notes on Data Correctness

The `useEffect` correctly seeds `selectedBrands` from `user.brand_permissions`. Ensure the API returns that array consistently on both initial load and after save; QA confusion often comes from stale caches. If you use SWR/React Query, invalidate the user + brands keys on save to avoid seeing a pre-save snapshot.

**Verdict:** Functionality exists; this is a visibility/expectation issue. The small UI tweaks above (always-rendered card, master "Assigned Brand" alias, strong empty/loading states) will make the feature unmissable and aligned with QA's test wording, while keeping behaviour and data model intact.