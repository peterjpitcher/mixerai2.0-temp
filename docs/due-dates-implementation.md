# Content Due Dates Implementation

This document describes the complete due dates feature implementation in MixerAI 2.0.

## Overview

The due dates feature allows users to:
- Set optional due dates when creating or editing content
- See visual indicators showing urgency (overdue, due today, upcoming)
- Track content deadlines across the platform
- Filter and sort content by due dates

## Components

### 1. DueDateIndicator Component (`/src/components/ui/due-date-indicator.tsx`)

Visual component that displays due dates with urgency indicators.

```tsx
<DueDateIndicator
  dueDate={content.due_date}
  status={content.status}
  size="sm"
  showIcon={true}
/>
```

**Visual States:**
- **Overdue** (red): Past due date, shows "Overdue by X days"
- **Due Today** (orange): Due within current day
- **Due Tomorrow** (orange): Due next day
- **Due Soon** (gray): Due within 3 days
- **Future** (outline): More than 3 days away
- **Completed** (green): Published/approved content shows completion date

### 2. DueDateDisplay Component

Alternative text-only display for due dates:

```tsx
<DueDateDisplay
  dueDate={content.due_date}
  format="MMM d, yyyy"
  showRelative={true}
/>
```

## Implementation Locations

### Content Creation
- **Location**: `/src/components/content/content-generator-form-refactored.tsx`
- **Feature**: DatePicker for selecting due date during content creation
- **Auto-save**: Due date is included in form persistence

### Content Editing
- **Location**: `/src/app/dashboard/content/[id]/edit/page.tsx`
- **Feature**: Editable due date field with DatePicker
- **Auto-save**: Changes trigger auto-save after 3 seconds

### Content List
- **Location**: `/src/app/dashboard/content/content-page-client.tsx`
- **Feature**: Due date column with visual indicators
- **Display**: Shows urgency badges for quick scanning

### My Tasks Page
- **Location**: `/src/app/dashboard/my-tasks/page.tsx`
- **Feature**: Due date column for assigned tasks
- **Purpose**: Helps users prioritize work

### Dashboard Widget
- **Location**: `/src/components/dashboard/upcoming-deadlines-widget.tsx`
- **Feature**: Shows top 5 upcoming deadlines
- **Filter**: Only shows draft/in-review content

## Database Schema

```sql
-- Content table
ALTER TABLE content ADD COLUMN due_date timestamp with time zone;

-- Index for performance
CREATE INDEX idx_content_due_date ON content(due_date) 
WHERE due_date IS NOT NULL AND status IN ('draft', 'in_review');
```

## API Integration

### Content API
- **Endpoint**: `/api/content`
- **Query Parameters**: 
  - `has_due_date=true` - Filter content with due dates
  - `sort=due_date` - Sort by due date ascending
  - `overdue=true` - Only overdue content

### Tasks API
- **Endpoint**: `/api/me/tasks`
- **Feature**: Returns due_date for each task
- **Usage**: Prioritization in My Tasks view

## DatePicker Component

Uses the custom DatePicker with:
- Calendar UI for date selection
- Keyboard navigation support
- Mobile-friendly interface
- Clear date option

```tsx
<DatePicker
  date={dueDate}
  onDateChange={(date) => setDueDate(date)}
  placeholder="Select a due date"
  disabled={false}
/>
```

## Email Notifications

Due dates are included in:
- Task assignment emails
- Reminder notifications (future feature)
- Workflow step notifications

## Sorting & Filtering

### Content List Filters
```typescript
// Show only content with due dates
filter: 'has_due_date'

// Show overdue content
filter: 'overdue'

// Sort by due date
sort: 'due_date'
```

### Dashboard Widgets
- Upcoming Deadlines Widget auto-filters and sorts
- Shows most urgent items first
- Excludes completed content

## Best Practices

### 1. Optional by Default
- Due dates are always optional
- Don't force users to set dates
- Provide clear UI to add/remove dates

### 2. Visual Hierarchy
- Use color coding consistently
- Show most urgent items prominently
- Include relative time ("2 days ago")

### 3. Context Awareness
- Show due dates where relevant
- Hide when content is completed
- Adjust messaging based on status

### 4. Performance
- Index due_date columns
- Use efficient queries
- Cache deadline calculations

## Future Enhancements

### 1. Notifications
- Email reminders before due dates
- In-app notifications for upcoming deadlines
- Escalation for overdue content

### 2. Bulk Operations
- Set due dates for multiple items
- Shift dates by X days
- Clear all due dates

### 3. Analytics
- On-time completion rates
- Average days overdue
- Due date distribution charts

### 4. Calendar View
- Monthly calendar showing all due dates
- Drag-and-drop to reschedule
- Team deadline visibility

## Troubleshooting

### Due Dates Not Showing
- Check if due_date field exists in database
- Verify API returns due_date in response
- Ensure DueDateIndicator is imported

### Incorrect Urgency Colors
- Verify timezone handling
- Check status parameter is passed
- Review date calculation logic

### Performance Issues
- Add database index on due_date
- Limit deadline queries to active content
- Use pagination for large datasets