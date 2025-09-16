---
title: Troubleshooting Guide
---

# Complete Troubleshooting Guide

This guide helps you resolve common issues in MixerAI quickly and effectively. Find solutions to problems with login, content, AI tools, performance, and more.

## Quick Diagnostics

### System Status Check
Before troubleshooting, check:
1. **MixerAI Status Page**: system.mixerai.com
2. **Browser Compatibility**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
3. **Internet Connection**: Stable connection required
4. **Browser Extensions**: Disable ad blockers/privacy tools
5. **Cache/Cookies**: Clear if experiencing issues

### Browser Console
Check for errors:
1. Press F12 (Windows/Linux) or Cmd+Option+I (Mac)
2. Click "Console" tab
3. Look for red error messages
4. Take screenshot for support

## Login & Authentication Issues

### Cannot Log In

#### Problem: Invalid Credentials
**Symptoms:**
- "Invalid email or password" error
- Cannot access account
- Login button doesn't work

**Solutions:**
1. **Check Credentials**
   - Verify email spelling
   - Check caps lock
   - Use correct email if multiple accounts
   
2. **Reset Password**
   - Click "Forgot Password"
   - Enter email address
   - Check email (including spam)
   - Click reset link within 24 hours
   - Create new password

3. **Clear Browser Data**
   ```
   Chrome: Settings → Privacy → Clear browsing data
   Firefox: Settings → Privacy → Clear Data
   Safari: Preferences → Privacy → Manage Website Data
   Edge: Settings → Privacy → Clear browsing data
   ```

#### Problem: Two-Factor Authentication Issues
**Symptoms:**
- 2FA code not working
- Lost authenticator device
- Backup codes unavailable

**Solutions:**
1. **Time Sync Issue**
   - Ensure device time is correct
   - Enable automatic time setting
   - Try code from 30 seconds ago/ahead

2. **Use Backup Codes**
   - Enter backup code instead
   - Each code works once
   - Generate new codes after use

3. **Contact Support**
   - Verify identity
   - Request 2FA reset
   - Provide account details

#### Problem: Account Locked
**Symptoms:**
- "Account locked" message
- Too many failed attempts
- Security violation detected

**Solutions:**
1. Wait 30 minutes and retry
2. Check email for unlock link
3. Contact administrator
4. Verify no security breach

### Session Problems

#### Problem: Frequent Logouts
**Symptoms:**
- Logged out unexpectedly
- Session expired quickly
- Need to log in repeatedly

**Solutions:**
1. **Check Session Settings**
   - Increase session timeout
   - Enable "Remember Me"
   - Check concurrent session settings

2. **Browser Issues**
   - Disable privacy mode
   - Allow cookies for MixerAI
   - Disable aggressive privacy extensions

3. **Network Issues**
   - Stable internet required
   - Check VPN settings
   - Verify firewall rules

## Content Management Issues

### Content Creation Problems

#### Problem: Content Won't Save
**Symptoms:**
- Save button not working
- "Failed to save" error
- Lost work

**Solutions:**
1. **Check Connection**
   - Verify internet connectivity
   - Check for timeout errors
   - Try saving again

2. **Validation Errors**
   - Check required fields
   - Verify character limits
   - Fix formatting issues

3. **Browser Storage**
   - Clear local storage
   - Check quota limits
   - Enable browser storage

4. **Recovery Options**
   - Check auto-save versions
   - Use browser back button
   - Contact support for recovery

#### Problem: Editor Not Loading
**Symptoms:**
- Blank editor screen
- Spinner never stops
- JavaScript errors

**Solutions:**
1. **Browser Compatibility**
   - Update browser
   - Try different browser
   - Disable extensions

2. **Clear Cache**
   ```bash
   Hard refresh:
   Windows/Linux: Ctrl + Shift + R
   Mac: Cmd + Shift + R
   ```

3. **Check Permissions**
   - Verify edit rights
   - Check brand access
   - Confirm role permissions

### Content Display Issues

#### Problem: Content Not Visible
**Symptoms:**
- Missing content in library
- Search returns no results
- Filters not working

**Solutions:**
1. **Check Filters**
   - Reset all filters
   - Check brand selection
   - Verify status filter
   - Clear search terms

2. **Permissions Issue**
   - Confirm brand access
   - Check content permissions
   - Verify publication status

3. **Sync Issues**
   - Refresh page
   - Clear cache
   - Log out and back in

#### Problem: Formatting Problems
**Symptoms:**
- Broken layouts
- Missing styles
- Incorrect formatting

**Solutions:**
1. **Editor Mode**
   - Switch between visual/HTML
   - Clean up HTML
   - Remove Word formatting

2. **Template Issues**
   - Refresh template
   - Check template version
   - Reset to default

## AI Tools Issues

### Generation Problems

#### Problem: AI Generation Fails
**Symptoms:**
- "Generation failed" error
- Timeout errors
- No response from AI

**Solutions:**
1. **Check AI Credits**
   - Verify credit balance
   - Check monthly limit
   - Purchase additional credits

2. **Input Issues**
   - Reduce input length
   - Simplify prompt
   - Remove special characters
   - Check language support

3. **Rate Limiting**
   - Wait 1 minute and retry
   - Check rate limit status
   - Reduce request frequency

4. **Service Status**
   - Check Azure OpenAI status
   - Verify API connectivity
   - Try fallback options

#### Problem: Poor AI Output Quality
**Symptoms:**
- Irrelevant content
- Repetitive text
- Grammar errors
- Wrong tone/style

**Solutions:**
1. **Improve Prompts**
   - Be more specific
   - Provide examples
   - Set clear constraints
   - Define target audience

2. **Adjust Settings**
   - Change temperature
   - Modify max tokens
   - Select different model
   - Update brand voice

3. **Post-Processing**
   - Edit generated content
   - Use enhancement tools
   - Regenerate sections
   - Combine multiple outputs

### API Integration Issues

#### Problem: API Errors
**Symptoms:**
- 401 Unauthorized
- 403 Forbidden
- 429 Too Many Requests
- 500 Server Error

**Solutions:**

**401 Unauthorized**
```
- Check API key validity
- Regenerate API key
- Verify authentication headers
- Check token expiration
```

**403 Forbidden**
```
- Verify permissions
- Check IP whitelist
- Confirm resource access
- Review role settings
```

**429 Rate Limited**
```
- Implement exponential backoff
- Check rate limit headers
- Reduce request frequency
- Upgrade plan if needed
```

**500 Server Error**
```
- Retry after 30 seconds
- Check status page
- Contact support
- Review error logs
```

## Performance Issues

### Slow Loading

#### Problem: Pages Load Slowly
**Symptoms:**
- Long loading times
- Timeouts
- Unresponsive interface

**Solutions:**
1. **Browser Optimization**
   - Clear cache and cookies
   - Disable unnecessary extensions
   - Update browser
   - Close unused tabs

2. **Network Issues**
   - Check internet speed
   - Disable VPN if slow
   - Try different network
   - Check firewall settings

3. **System Settings**
   - Reduce dashboard widgets
   - Decrease page size
   - Disable animations
   - Use list view vs grid

#### Problem: High Memory Usage
**Symptoms:**
- Browser becomes sluggish
- Computer fans running
- Page crashes

**Solutions:**
1. Close unused tabs
2. Restart browser regularly
3. Disable memory-intensive features
4. Use lighter theme
5. Reduce concurrent operations

### Search Problems

#### Problem: Search Not Working
**Symptoms:**
- No results found
- Incorrect results
- Search crashes

**Solutions:**
1. **Query Issues**
   - Check spelling
   - Use simpler terms
   - Remove special characters
   - Try partial words

2. **Index Problems**
   - Wait for indexing
   - Request re-index
   - Clear search cache

## Workflow Issues

### Workflow Stuck

#### Problem: Content Stuck in Stage
**Symptoms:**
- No progress for days
- Cannot move forward
- Missing approvers

**Solutions:**
1. **Check Assignees**
   - Verify assignee active
   - Reassign if needed
   - Check out of office
   - Escalate to manager

2. **Condition Issues**
   - Review stage conditions
   - Check required fields
   - Verify dependencies
   - Fix validation errors

3. **Manual Override**
   - Request admin intervention
   - Skip stage if allowed
   - Force progression
   - Cancel and restart

### Notification Problems

#### Problem: Not Receiving Notifications
**Symptoms:**
- Missing email alerts
- No in-app notifications
- Delayed notifications

**Solutions:**
1. **Check Settings**
   - Verify notification preferences
   - Check email address
   - Enable notifications
   - Check mute settings

2. **Email Issues**
   - Check spam folder
   - Whitelist MixerAI emails
   - Verify email filters
   - Check email quota

3. **Browser Notifications**
   - Allow browser notifications
   - Check system notifications
   - Disable Do Not Disturb
   - Check notification permissions

## Data & Sync Issues

### Import/Export Problems

#### Problem: Import Fails
**Symptoms:**
- "Import failed" error
- Partial imports
- Data corruption

**Solutions:**
1. **File Issues**
   - Check file format
   - Verify file size limits
   - Remove special characters
   - Fix encoding (UTF-8)

2. **Data Validation**
   - Check required fields
   - Verify data types
   - Fix date formats
   - Remove duplicates

3. **Process Issues**
   - Import smaller batches
   - Use template exactly
   - Check field mapping
   - Review error logs

#### Problem: Export Not Working
**Symptoms:**
- Export button disabled
- Empty exports
- Corrupted files

**Solutions:**
1. Select less data
2. Try different format
3. Check permissions
4. Clear browser cache
5. Use API export

### Database Errors

#### Problem: Data Not Saving
**Symptoms:**
- Changes not persisting
- Rollback occurring
- Transaction errors

**Solutions:**
1. Check field validation
2. Verify permissions
3. Check for conflicts
4. Retry operation
5. Contact support

## Mobile Issues

### Mobile App Problems

#### Problem: App Crashes
**Symptoms:**
- App closes unexpectedly
- Freezes on launch
- Black screen

**Solutions:**
1. **App Updates**
   - Update to latest version
   - Check app store
   - Enable auto-updates

2. **Device Issues**
   - Restart device
   - Clear app cache
   - Reinstall app
   - Free up storage

3. **Account Issues**
   - Log out and back in
   - Check credentials
   - Verify permissions

### Responsive Design Issues

#### Problem: Layout Broken on Mobile
**Symptoms:**
- Overlapping elements
- Missing buttons
- Horizontal scroll

**Solutions:**
1. Use mobile view mode
2. Zoom out to 100%
3. Rotate device
4. Use desktop mode
5. Try mobile app

## Security Issues

### Suspicious Activity

#### Problem: Unauthorized Access Suspected
**Symptoms:**
- Unknown login locations
- Changed settings
- Missing content
- Strange activity

**Immediate Actions:**
1. **Change Password Immediately**
2. **Enable 2FA**
3. **Review Login History**
4. **Revoke All Sessions**
5. **Contact Support**

**Follow-up Actions:**
- Review permissions
- Audit user access
- Check API keys
- Review activity logs
- Update security settings

### Permission Errors

#### Problem: Access Denied
**Symptoms:**
- 403 Forbidden errors
- "No permission" messages
- Features unavailable

**Solutions:**
1. **Verify Access**
   - Check role assignment
   - Confirm brand access
   - Review team membership
   - Check license limits

2. **Request Access**
   - Contact administrator
   - Request role change
   - Join required team
   - Get brand access

## Getting Help

### Self-Service Resources
1. **Knowledge Base**: help.mixerai.com
2. **Video Tutorials**: youtube.com/mixerai
3. **Community Forum**: community.mixerai.com
4. **Status Page**: status.mixerai.com

### Contact Support

#### Information to Provide
When contacting support, include:
1. **Account Information**
   - Email address
   - Organization name
   - Subscription type

2. **Issue Details**
   - Clear description
   - Steps to reproduce
   - Expected behavior
   - Actual behavior

3. **Technical Information**
   - Browser and version
   - Operating system
   - Error messages
   - Screenshots
   - Console logs

4. **Attempted Solutions**
   - What you've tried
   - Results of attempts

#### Support Channels
- **Email**: support@mixerai.com
- **Live Chat**: Available 9am-5pm EST
- **Phone**: 1-800-MIXER-AI (Enterprise only)
- **Priority Support**: enterprise@mixerai.com

#### Response Times
- **Free**: 48-72 hours
- **Professional**: 24 hours
- **Enterprise**: 4 hours
- **Critical (Enterprise)**: 1 hour

## Preventive Measures

### Best Practices
1. **Regular Maintenance**
   - Clear cache weekly
   - Update browser monthly
   - Review permissions quarterly
   - Audit access annually

2. **Data Protection**
   - Regular backups
   - Version control
   - Save frequently
   - Export important data

3. **Security**
   - Strong passwords
   - Enable 2FA
   - Regular security reviews
   - Monitor activity

4. **Performance**
   - Optimize images
   - Limit concurrent tasks
   - Use efficient queries
   - Archive old content

## Common Error Codes

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **204**: No content
- **400**: Bad request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not found
- **409**: Conflict
- **422**: Validation error
- **429**: Too many requests
- **500**: Server error
- **502**: Bad gateway
- **503**: Service unavailable

### Application Error Codes
- **ERR_AUTH_001**: Authentication failed
- **ERR_AUTH_002**: Session expired
- **ERR_PERM_001**: Insufficient permissions
- **ERR_CONTENT_001**: Content validation failed
- **ERR_AI_001**: AI generation failed
- **ERR_AI_002**: AI credits exhausted
- **ERR_DB_001**: Database connection error
- **ERR_API_001**: API rate limit exceeded

## Conclusion

Most issues in MixerAI can be resolved by:
1. Checking your connection and browser
2. Verifying permissions and settings
3. Clearing cache and cookies
4. Following the specific solutions above

If problems persist after trying these solutions, don't hesitate to contact our support team with detailed information about your issue.