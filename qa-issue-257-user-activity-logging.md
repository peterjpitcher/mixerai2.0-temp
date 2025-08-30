# QA Issue #257: User Activity Log Not Showing 30 Days History

**Status:** CLOSED  
**Priority:** P2: Medium  
**Labels:** QA failed, ready for QA

## Issue Description
As mentioned in the test case, we don't have provision to see user's Last 30 days of activity.

## Steps to Reproduce
1. Go to https://mixerai.orangejelly.co.uk/dashboard
2. Navigate to the User section
3. Click on existing user
4. Look for user Activity

## Expected Behavior
The User Activity Log should include showing the user's activity for the last 30 days, as outlined in the test case.

## Actual Behavior
As mentioned in the testcase we don't have provision to see user Last 30 days of activity.

## Screenshot
![User Activity View](https://github.com/user-attachments/assets/4999684c-f828-40ff-9c44-a0a0a5b52805)

## Comprehensive Technical Analysis

### Files Investigated
1. `src/app/dashboard/users/[id]/page.tsx` (User detail page with activity section)
2. `src/app/api/users/[id]/activity/route.ts` (Activity API endpoint)
3. `src/lib/api-client.ts` (API client utilities)
4. `supabase/migrations/20241221_user_activity_logging.sql` (Database schema)

### Current Implementation Deep Dive

#### 1. The Activity API Endpoint - FULLY IMPLEMENTED (src/app/api/users/[id]/activity/route.ts)

The backend API is complete and functional (lines 11-100+):

```typescript
// GET user activity log for the last 30 days
export const GET = withRouteAuth(async (_request: NextRequest, user: User, context: Record<string, unknown>) => {
  const { params } = context as { params: { id: string } };
  try {
    const supabase = createSupabaseServerClient();
    const isViewingOwnProfile = user.id === params.id;
    const isGlobalAdmin = user.user_metadata?.role === 'admin';

    // A user can view their own activity, or a global admin can view any user's activity
    if (!isViewingOwnProfile && !isGlobalAdmin) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this user activity.' },
        { status: 403 }
      );
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch various activities for the user
    interface ActivityItem {
      type: string;
      action: string;
      description: string;
      timestamp: string;
      metadata: Record<string, unknown>;
    }
    const activities: ActivityItem[] = [];

    // Get content created/modified
    const { data: contentActivity } = await supabase
      .from('content')
      .select('id, title, created_at, updated_at, status')
      .or(`created_by.eq.${params.id},updated_by.eq.${params.id}`)
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(50);

    if (contentActivity) {
      contentActivity.forEach(content => {
        activities.push({
          type: 'content',
          action: content.created_by === params.id ? 'created' : 'updated',
          description: `${content.created_by === params.id ? 'Created' : 'Updated'} content: ${content.title || 'Untitled'}`,
          timestamp: content.updated_at || content.created_at,
          metadata: {
            contentId: content.id,
            status: content.status
          }
        });
      });
    }

    // Get workflow activity
    const { data: workflowActivity } = await supabase
      .from('workflow_history')
      .select('*')
      .eq('performed_by', params.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (workflowActivity) {
      workflowActivity.forEach(activity => {
        activities.push({
          type: 'workflow',
          action: activity.action,
          description: `Workflow action: ${activity.action} - ${activity.notes || 'No notes'}`,
          timestamp: activity.created_at,
          metadata: {
            contentId: activity.content_id,
            fromStep: activity.from_step,
            toStep: activity.to_step
          }
        });
      });
    }

    // Get invitation activity
    const { data: invitationActivity } = await supabase
      .from('invitations')
      .select('*')
      .eq('invited_by', params.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (invitationActivity) {
      invitationActivity.forEach(invitation => {
        activities.push({
          type: 'invitation',
          action: 'sent',
          description: `Sent invitation to ${invitation.email}`,
          timestamp: invitation.created_at,
          metadata: {
            email: invitation.email,
            status: invitation.status
          }
        });
      });
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate activity statistics
    const stats = {
      totalActivities: activities.length,
      contentCreated: activities.filter(a => a.type === 'content' && a.action === 'created').length,
      contentUpdated: activities.filter(a => a.type === 'content' && a.action === 'updated').length,
      workflowActions: activities.filter(a => a.type === 'workflow').length,
      invitationsSent: activities.filter(a => a.type === 'invitation').length,
      mostActiveDay: getMostActiveDay(activities),
      lastActivity: activities[0]?.timestamp || null
    };

    return NextResponse.json({
      success: true,
      activities: activities.slice(0, 100), // Limit to 100 most recent
      stats,
      period: {
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString()
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
});
```

#### 2. The User Detail Page UI - SECTION EXISTS BUT NOT CONNECTED (src/app/dashboard/users/[id]/page.tsx)

The UI for displaying activities is present (lines 385-425):

```typescript
// Line 96-98: State declarations
const [activities, setActivities] = useState<any[]>([]);
const [activityStats, setActivityStats] = useState<any>(null);
const [isLoadingActivity, setIsLoadingActivity] = useState(false);

// Lines 385-425: The User Activity Log Card
<Card>
  <CardHeader>
    <CardTitle className="flex items-center">
      <Activity className="mr-2 h-5 w-5 text-primary" /> User Activity Log
    </CardTitle>
    <CardDescription>Activity from the last 30 days</CardDescription>
  </CardHeader>
  <CardContent>
    {isLoadingActivity ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    ) : activities.length > 0 ? (
      <div className="space-y-4">
        {/* Activity Timeline */}
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
              <div className="mt-1">
                {activity.type === 'content' && <FileText className="h-4 w-4 text-blue-500" />}
                {activity.type === 'workflow' && <GitPullRequest className="h-4 w-4 text-purple-500" />}
                {activity.type === 'invitation' && <UserCircle2 className="h-4 w-4 text-green-500" />}
                {activity.type === 'login' && <LogIn className="h-4 w-4 text-gray-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(activity.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Activity Stats */}
        {activityStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground">Total Activities</p>
              <p className="text-lg font-semibold">{activityStats.totalActivities}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Content Created</p>
              <p className="text-lg font-semibold">{activityStats.contentCreated}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Workflow Actions</p>
              <p className="text-lg font-semibold">{activityStats.workflowActions}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Activity</p>
              <p className="text-sm font-medium">
                {activityStats.lastActivity ? formatDate(activityStats.lastActivity) : 'Never'}
              </p>
            </div>
          </div>
        )}
      </div>
    ) : (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No activity recorded in the last 30 days</p>
      </div>
    )}
  </CardContent>
</Card>
```

#### 3. THE CRITICAL BUG - No Data Fetching Logic

The problem is in the useEffect at line 100. It fetches user data but **NEVER fetches activity data**:

```typescript
// Current implementation - Line 100-131
useEffect(() => {
  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/users/${params.id}`);
      const data = await response.json();
      
      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (params?.id) {
    fetchUser();
    // NOTICE: NO fetchActivity() call here!
  }
}, [params?.id]);

// MISSING: There should be another useEffect or combined logic to fetch activity:
// useEffect(() => {
//   const fetchActivity = async () => {
//     setIsLoadingActivity(true);
//     try {
//       const response = await apiFetch(`/api/users/${params.id}/activity`);
//       const data = await response.json();
//       if (data.success) {
//         setActivities(data.activities);
//         setActivityStats(data.stats);
//       }
//     } catch (error) {
//       console.error('Error fetching activity:', error);
//     } finally {
//       setIsLoadingActivity(false);
//     }
//   };
//
//   if (user && params?.id) {
//     fetchActivity();
//   }
// }, [user, params?.id]);
```

### Root Cause Analysis

The issue is a **simple oversight** - the developer:
1. Created the complete backend API for fetching activities ✅
2. Created the complete UI for displaying activities ✅
3. Created the state variables for storing activities ✅
4. **FORGOT to actually call the API and fetch the data** ❌

This is a classic case of incomplete integration where all the pieces exist but aren't connected.

### Evidence of the Bug

1. **State Initialization** (line 96-98):
   ```typescript
   const [activities, setActivities] = useState<any[]>([]); // Always empty
   const [isLoadingActivity, setIsLoadingActivity] = useState(false); // Always false
   ```

2. **No API Call**: Searching the entire file shows no reference to `/api/users/[id]/activity`

3. **Unused Setters**: `setActivities` and `setActivityStats` are never called

4. **Static Loading State**: `isLoadingActivity` is always false, so the UI always shows "No activity recorded"

### Proposed Solution

#### Complete Implementation - Add the Missing useEffect

```typescript
// Add this after the existing useEffect (around line 131)
useEffect(() => {
  const fetchUserActivity = async () => {
    if (!user || !params?.id) return;
    
    setIsLoadingActivity(true);
    try {
      const response = await apiFetch(`/api/users/${params.id}/activity`);
      const data = await response.json();
      
      if (data.success) {
        setActivities(data.activities || []);
        setActivityStats(data.stats || null);
      } else {
        console.error('Failed to fetch activity:', data.error);
        toast.error('Failed to load user activity');
      }
    } catch (error) {
      console.error('Error fetching user activity:', error);
      toast.error('An error occurred while loading activity');
      setActivities([]);
      setActivityStats(null);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Only fetch activity after user is loaded
  if (user && params?.id) {
    fetchUserActivity();
  }
}, [user, params?.id]);
```

#### Alternative: Combine Both Fetches

```typescript
useEffect(() => {
  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      // Fetch user and activity in parallel
      const [userResponse, activityResponse] = await Promise.all([
        apiFetch(`/api/users/${params.id}`),
        apiFetch(`/api/users/${params.id}/activity`)
      ]);
      
      const userData = await userResponse.json();
      const activityData = await activityResponse.json();
      
      if (userData.success && userData.user) {
        setUser(userData.user);
      } else {
        setUser(null);
      }
      
      if (activityData.success) {
        setActivities(activityData.activities || []);
        setActivityStats(activityData.stats || null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUser(null);
      setActivities([]);
    } finally {
      setIsLoading(false);
      setIsLoadingActivity(false);
    }
  };

  if (params?.id) {
    fetchUserData();
  }
}, [params?.id]);
```

### Additional Enhancements to Consider

#### 1. Add Refresh Capability
```typescript
const refreshActivity = async () => {
  setIsLoadingActivity(true);
  // ... fetch logic
};

// In the UI
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center">
      <Activity className="mr-2 h-5 w-5 text-primary" /> User Activity Log
    </CardTitle>
    <Button 
      size="sm" 
      variant="ghost" 
      onClick={refreshActivity}
      disabled={isLoadingActivity}
    >
      <RefreshCw className="h-4 w-4" />
    </Button>
  </div>
</CardHeader>
```

#### 2. Add Pagination for Large Activity Lists
```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const ITEMS_PER_PAGE = 20;

// In the fetch function
const response = await apiFetch(
  `/api/users/${params.id}/activity?page=${page}&limit=${ITEMS_PER_PAGE}`
);

// Add load more button
{hasMore && (
  <Button 
    variant="outline" 
    onClick={() => setPage(p => p + 1)}
    className="w-full"
  >
    Load More
  </Button>
)}
```

#### 3. Add Activity Filtering
```typescript
const [activityFilter, setActivityFilter] = useState<'all' | 'content' | 'workflow' | 'invitation'>('all');

const filteredActivities = activities.filter(activity => 
  activityFilter === 'all' || activity.type === activityFilter
);

// Add filter UI
<Select value={activityFilter} onValueChange={setActivityFilter}>
  <SelectTrigger className="w-[180px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Activities</SelectItem>
    <SelectItem value="content">Content Only</SelectItem>
    <SelectItem value="workflow">Workflow Only</SelectItem>
    <SelectItem value="invitation">Invitations Only</SelectItem>
  </SelectContent>
</Select>
```

### Testing Requirements

1. **Unit Tests**:
   - Test the activity API endpoint with various scenarios
   - Test activity formatting and sorting logic
   - Test permission checks (own profile vs admin viewing others)

2. **Integration Tests**:
   - Test the complete flow from UI to API to database
   - Test with users having different activity levels
   - Test the 30-day filtering logic

3. **E2E Tests**:
   - Navigate to user profile and verify activity loads
   - Test activity updates when user performs actions
   - Test permission-based visibility

### Additional Considerations for Senior Review

1. **Performance**: 
   - Consider caching activity data for frequently viewed users
   - Implement virtual scrolling for very long activity lists
   - Consider aggregating old activities

2. **Real-time Updates**:
   - Consider using WebSockets or Server-Sent Events for live activity updates
   - Implement optimistic UI updates for user's own actions

3. **Data Privacy**:
   - Ensure activity logs don't expose sensitive information
   - Consider what activities should be visible to different user roles

4. **Audit Trail**:
   - The activity log could serve as an audit trail
   - Consider adding more detailed tracking for compliance

5. **Database Indexing**:
   - Ensure proper indexes on `created_at`, `updated_at`, `created_by`, `updated_by` columns
   - Consider partitioning the activity tables by date for better performance

### Recommended Immediate Fix

Implement the first solution (add the missing useEffect) as it's the simplest and maintains the existing architecture. This is a one-line conceptual fix that just connects the existing pieces:

1. Add the useEffect to fetch activity data
2. Ensure proper error handling
3. Add loading states
4. Deploy and verify

The feature is 95% complete - it just needs the final connection between the UI and API.

---

## Senior Developer Feedback

### Diagnosis

All backend + UI scaffolding exists, but the **user detail page never calls the activity API**. As a result:

* `activities` stays `[]`
* `isLoadingActivity` stays `false`
* The card renders the "No activity recorded…" empty state

### Minimal Patch (Connect the Dots)

Add a second `useEffect` to fetch activity **after** the user load finishes:

```tsx
// after the existing useEffect that loads the user
useEffect(() => {
  if (!params?.id) return;

  const fetchActivity = async () => {
    setIsLoadingActivity(true);
    try {
      const res = await apiFetch(`/api/users/${params.id}/activity`);
      const data = await res.json();
      if (data?.success) {
        setActivities(data.activities ?? []);
        setActivityStats(data.stats ?? null);
      } else {
        console.error('Activity fetch failed:', data?.error);
        setActivities([]);
        setActivityStats(null);
      }
    } catch (err) {
      console.error('Activity fetch error:', err);
      setActivities([]);
      setActivityStats(null);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Option A: fetch regardless of `user` (API already enforces auth/authorisation)
  fetchActivity();

  // Option B (slightly stricter): only after user is loaded
  // if (user) fetchActivity();

}, [params?.id /*, user */]);
```

If you prefer parallelised loading (slightly faster initial paint), replace your single user fetch with:

```tsx
useEffect(() => {
  if (!params?.id) return;

  (async () => {
    setIsLoading(true);
    setIsLoadingActivity(true);
    try {
      const [userRes, actRes] = await Promise.all([
        apiFetch(`/api/users/${params.id}`),
        apiFetch(`/api/users/${params.id}/activity`)
      ]);
      const userData = await userRes.json();
      const actData = await actRes.json();

      setUser(userData?.success ? userData.user : null);
      setActivities(actData?.success ? (actData.activities ?? []) : []);
      setActivityStats(actData?.success ? (actData.stats ?? null) : null);
    } catch (e) {
      console.error('User/Activity fetch error:', e);
      setUser(null);
      setActivities([]);
      setActivityStats(null);
    } finally {
      setIsLoading(false);
      setIsLoadingActivity(false);
    }
  })();
}, [params?.id]);
```

### Nice-to-have UX/Ops (Low Risk)

#### 1. Manual Refresh
Add a ghost button in the card header to re-fetch:

```tsx
<Button size="sm" variant="ghost" onClick={() => router.refresh()} disabled={isLoadingActivity}>
  <RefreshCw className="h-4 w-4" />
</Button>
```

(or call `fetchActivity()` again if you keep it local)

#### 2. Empty State Clarity
If your API returns `{ period: { from, to } }`, surface it in the description:
"Activity from the last 30 days ({{from}} → {{to}})".

#### 3. Pagination-ready API (Optional)
Support `?limit=20&cursor=…` in `/activity` and add a "Load more" button when `hasMore` is true.

### Backend Sanity (Already Good, Just Confirm)

* Endpoint filters `>= 30 days ago` and merges sources—👍
* Ensure **indexes** exist on queried columns:
  * `content(updated_at)`, `content(created_by)`, `content(updated_by)`
  * `workflow_history(created_at, performed_by)`
  * `invitations(created_at, invited_by)`

### QA Checklist (To Close the Ticket)

- [ ] Visiting `/dashboard/users/:id` shows the spinner in "User Activity Log", then renders entries (if any within 30 days)
- [ ] With no activity in last 30 days, shows the empty-state message (not a missing section)
- [ ] Admin can view any user's activity; non-admin can only view their own (403 otherwise)
- [ ] Timestamps display correctly and sorted desc
- [ ] Stats counters reflect the loaded list

This wiring change is small, risk-free, and aligns the UI with the already-complete API, satisfying the "last 30 days" test case.