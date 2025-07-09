# Issue Reporter

The Issue Reporter is a built-in feature that allows users to quickly report bugs and issues directly from within the application. It captures comprehensive diagnostic information including screenshots, console logs, and network activity.

## Features

- **Floating Action Button**: Draggable button positioned in the bottom-right corner
- **Screenshot Capture**: Automatically captures the current page state
- **Console Log Collection**: Records the last 100 console entries (logs, warnings, errors)
- **Network Request Tracking**: Captures the last 50 network requests
- **GitHub Integration**: Creates issues directly in your GitHub repository
- **Rate Limiting**: 30 issues per hour per user to prevent spam

## Setup

### 1. Environment Variables

Ensure these environment variables are set:

```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username_or_org
GITHUB_REPO=your_repository_name
```

The GitHub token needs the `repo` scope to create issues and upload files.

### 2. Screenshot Directory Setup

Run the setup script to create the screenshot directory in your GitHub repository:

```bash
npm run setup:screenshots
```

This creates a `.github/issue-screenshots/` directory in your repository where screenshots will be uploaded.

## How It Works

### User Flow

1. User clicks the floating bug icon in the bottom-right corner
2. A modal opens with a form to describe the issue
3. The system automatically captures:
   - Current page screenshot
   - Recent console logs
   - Recent network requests
   - Browser and viewport information
4. User fills out the issue title, description, and priority
5. On submission, the system:
   - Creates a GitHub issue with all information
   - Uploads the screenshot to the repository
   - Adds the screenshot as a comment on the issue

### Technical Details

#### Components

- **FloatingIssueButton**: The draggable floating action button
- **IssueReporterModal**: The main form interface
- **IssueReporter**: Container component that manages state

#### Libraries

- **html2canvas**: For screenshot capture
- **react-hook-form**: Form management
- **zod**: Form validation
- **GitHub API**: Issue creation and file uploads

#### Data Capture

**Console Logs**:
- Intercepts `console.log`, `console.warn`, `console.error`, and `console.info`
- Maintains a circular buffer of 100 entries
- Captures stack traces for errors

**Network Logs**:
- Intercepts `fetch` API calls
- Records method, URL, status, duration, and errors
- Maintains a circular buffer of 50 requests

**Screenshots**:
- Uses html2canvas to capture the visible page
- Compresses images over 500KB
- Uploads to GitHub using the Contents API

### Rate Limiting

- 30 issues per hour per user
- Rate limit information included in response headers
- Clear error messages when limit exceeded

## Security Considerations

- Screenshots may contain sensitive information
- Ensure your GitHub repository is private if handling sensitive data
- The issue reporter is only available to authenticated users
- All API calls require authentication

## Troubleshooting

### Screenshots Not Displaying

If screenshots aren't showing in GitHub issues:

1. Verify the setup script ran successfully
2. Check that the GitHub token has write permissions
3. Ensure the `.github/issue-screenshots/` directory exists
4. Check browser console for upload errors

### Rate Limit Errors

If users hit rate limits:
- The limit resets after 1 hour
- Consider increasing the limit in the API route
- Monitor for potential abuse

### Console Capture Not Working

If console logs aren't being captured:
- Ensure the console capture is initialized early in the app
- Check for conflicts with other console interceptors
- Verify the component is mounted in the layout

## Customization

### Changing Position

Modify the `position` prop on `FloatingIssueButton`:
```tsx
<FloatingIssueButton position="bottom-left" />
```

### Adjusting Rate Limits

Edit the rate limit in `/src/app/api/github/issues/route.ts`:
```typescript
const maxRequests = 30; // Change this value
```

### Custom Labels

Modify the labels array in the POST endpoint:
```typescript
const labels = ['user-reported', 'bug']; // Add custom labels
```

## Maintenance

### Cleaning Up Old Screenshots

Screenshots accumulate over time. Consider:
- Implementing a cleanup script for closed issues
- Using GitHub Actions to periodically clean old files
- Setting up a retention policy

### Monitoring Usage

Track issue creation:
- Monitor rate limit hits
- Review issue quality
- Analyze common problem areas

## Future Enhancements

- Session replay integration
- Performance metrics capture
- Custom fields for specific issue types
- Integration with error tracking services
- Automatic duplicate detection