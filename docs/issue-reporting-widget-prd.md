# Product Requirements Document: Issue Reporting Widget

## 1. Executive Summary

### Overview
This PRD outlines the implementation of a floating issue reporting widget for MixerAI 2.0 that enables users to quickly report bugs and issues directly to GitHub. The widget will capture console logs, screenshots, URL context, and other helpful debugging information to create comprehensive bug reports.

### Objectives
- Reduce friction in bug reporting process
- Improve issue quality with automatic context capture
- Streamline developer debugging with comprehensive information
- Integrate seamlessly with existing GitHub workflow

## 2. Feature Description

### Core Functionality
A persistent floating action button (FAB) that, when clicked, opens a modal allowing users to:
1. Describe the issue they encountered
2. Automatically capture a screenshot of the current page
3. Include console logs and errors
4. Submit the issue directly to the project's GitHub repository

### Key Components
1. **Floating Action Button (FAB)**
   - Persistent across all dashboard pages
   - Minimally intrusive design
   - Configurable position (bottom-right by default)
   - Visual feedback on hover/click

2. **Issue Reporting Modal**
   - Title and description fields
   - Screenshot preview with annotation capability
   - Console log preview (sanitized)
   - Environment information display
   - Priority selection
   - Submit/Cancel actions

3. **Data Collection System**
   - Console log interceptor
   - Screenshot capture utility
   - Environment data collector
   - Error boundary integration

4. **GitHub Integration**
   - Issue creation via GitHub API
   - Automatic labeling
   - Screenshot attachment handling
   - Markdown formatting

## 3. Technical Architecture

### Frontend Components

#### Floating Button Component
```typescript
interface FloatingIssueButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  isEnabled?: boolean;
  zIndex?: number;
}
```

#### Issue Reporting Modal
```typescript
interface IssueReportData {
  title: string;
  description: string;
  screenshot?: string; // base64
  consoleLogs: ConsoleLog[];
  environment: EnvironmentData;
  url: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  userAgent: string;
  timestamp: string;
}
```

#### Console Log Capture
```typescript
interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  stack?: string;
}
```

### Backend API Enhancement

#### POST /api/github/issues
```typescript
interface CreateIssueRequest {
  title: string;
  body: string; // Markdown formatted
  labels?: string[];
  assignees?: string[];
  screenshot?: string; // base64
}
```

### Data Flow
1. User clicks floating button
2. Modal opens with pre-filled environment data
3. Screenshot is captured using html2canvas
4. Console logs are retrieved from buffer
5. User fills in title and description
6. Data is sanitized for sensitive information
7. Issue is created via GitHub API
8. Screenshot is uploaded as attachment
9. User receives confirmation

## 4. Implementation Details

### Console Log Capture Strategy
```javascript
// Override console methods at app initialization
const logBuffer = [];
const MAX_LOGS = 100;

['log', 'warn', 'error', 'info'].forEach(method => {
  const original = console[method];
  console[method] = function(...args) {
    logBuffer.push({
      level: method,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' '),
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    
    // Maintain buffer size
    if (logBuffer.length > MAX_LOGS) {
      logBuffer.shift();
    }
    
    return original.apply(console, args);
  };
});
```

### Screenshot Capture
- Use html2canvas library for client-side screenshot
- Implement viewport scrolling for full-page capture
- Add annotation tools for highlighting issues
- Compress images before upload

### Sensitive Data Handling
- Implement regex patterns to detect and redact:
  - API keys and tokens
  - Email addresses
  - Phone numbers
  - Credit card numbers
  - Passwords
- Allow user review before submission

### GitHub Integration
- Use existing GitHub token from environment
- Create issues with structured markdown template
- Add appropriate labels (bug, user-reported, priority)
- Include metadata in collapsible sections

## 5. User Experience

### Activation Flow
1. Floating button appears on all dashboard pages
2. Click opens modal with loading state
3. Screenshot captures automatically
4. Form pre-fills with context data
5. User adds title and description
6. Preview shows formatted issue
7. Submit creates GitHub issue
8. Success/error feedback

### Modal Layout
```
┌─────────────────────────────────────┐
│ Report an Issue                   X │
├─────────────────────────────────────┤
│ Title: [___________________]        │
│                                     │
│ Description:                        │
│ [_________________________________] │
│ [_________________________________] │
│                                     │
│ Priority: [P2: Medium ▼]            │
│                                     │
│ Screenshot:                         │
│ ┌─────────────────┐                │
│ │                 │ [Annotate]      │
│ │   Preview       │                 │
│ └─────────────────┘                │
│                                     │
│ Console Logs (last 50):             │
│ ┌─────────────────┐                │
│ │ • Error: ...    │                 │
│ │ • Warning: ...  │                 │
│ └─────────────────┘                │
│                                     │
│ [Cancel]              [Submit Issue]│
└─────────────────────────────────────┘
```

## 6. Security Considerations

### Data Sanitization
- Remove authentication tokens
- Redact personal information
- Sanitize file paths
- Clear sensitive headers

### Access Control
- Require user authentication
- Rate limit issue creation
- Validate GitHub token permissions
- Log issue creation for audit

### CORS and CSP
- Configure Content Security Policy for screenshot capture
- Handle cross-origin content appropriately
- Implement proxy for external resources if needed

## 7. Performance Optimization

### Console Log Buffer
- Circular buffer with 100 entry limit
- Debounced writes to prevent memory leaks
- Lazy loading of logs in modal

### Screenshot Optimization
- Compress images before upload
- Implement progressive rendering
- Cache screenshot for re-submission
- Limit capture area for performance

### Bundle Size
- Lazy load html2canvas
- Tree-shake unused features
- Minimize floating button footprint

## 8. Success Metrics

### Quantitative
- Time to report issue < 30 seconds
- Screenshot capture success rate > 95%
- Issue creation success rate > 99%
- Console log capture accuracy 100%

### Qualitative
- Improved issue quality and detail
- Reduced back-and-forth for clarification
- Faster bug resolution time
- Higher user satisfaction

## 9. Future Enhancements

### Phase 2
- Video recording capability
- Network request logging
- Redux/state capture
- Automated reproduction steps

### Phase 3
- AI-powered issue categorization
- Duplicate detection
- Auto-assignment rules
- Integration with error tracking services

## 10. Questions for Clarification

Before implementation, we need to clarify:

1. **Visibility Control**: Should the floating button be:
   - Visible to all users?
   - Only visible to specific roles (admin, developers)?
   - Toggleable via user preferences?
   - Environment-specific (dev/staging only)?

2. **GitHub Repository**: Which repository should issues be created in?
   - Same repository as the codebase?
   - Separate issue tracking repository?
   - Configurable per deployment?

3. **Issue Templates**: Do you have preferred:
   - Issue title format?
   - Label conventions?
   - Priority definitions?
   - Assignee rules?

4. **Screenshot Preferences**:
   - Full page or viewport only?
   - Include annotation tools?
   - Maximum file size limits?
   - Image format (PNG/JPEG)?

5. **Console Log Filtering**:
   - Include all log levels or errors only?
   - Maximum number of logs to include?
   - Time window for log collection?
   - Exclude specific patterns?

6. **Privacy Considerations**:
   - What data should be automatically redacted?
   - User consent for data collection?
   - GDPR compliance requirements?
   - Data retention policies?

7. **Integration Points**:
   - Should it integrate with existing error boundaries?
   - Connect to any analytics services?
   - Trigger any webhooks or notifications?
   - Work with existing support tools?

8. **Mobile Support**:
   - Should the widget work on mobile devices?
   - Different UX for touch devices?
   - Simplified capture on mobile?

9. **Customization Options**:
   - Allow custom fields in the form?
   - Configurable button appearance?
   - Custom pre-submission hooks?
   - Extensible data collectors?

10. **Rate Limiting**:
    - Maximum issues per user per hour?
    - Global rate limits?
    - Abuse prevention measures?

## 11. Technical Recommendations

Based on the research and existing codebase analysis:

### Recommended Libraries
1. **html2canvas** - Most mature and widely adopted screenshot library
2. **React Hook Form** - Already in use, maintain consistency
3. **Zod** - For form validation, already in codebase
4. **Radix UI / shadcn/ui** - For modal and UI components

### Implementation Priority
1. Basic floating button and modal
2. Console log capture
3. Screenshot functionality
4. GitHub API integration
5. Data sanitization
6. Enhanced features (annotations, etc.)

### Testing Strategy
- Unit tests for console interceptors
- Integration tests for GitHub API
- E2E tests for full flow
- Manual testing on various browsers
- Performance benchmarks

## 12. Conclusion

This issue reporting widget will significantly improve the bug reporting experience by automating context collection and streamlining submission. The implementation leverages existing infrastructure while adding minimal complexity to the codebase.

The key to success will be balancing comprehensive data collection with performance and privacy considerations. With proper implementation, this feature will reduce debugging time and improve overall product quality.