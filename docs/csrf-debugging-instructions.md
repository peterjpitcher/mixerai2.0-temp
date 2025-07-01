# CSRF Token Debugging Instructions

## Steps to Debug

1. **Clear Everything**
   - Open Chrome DevTools (F12)
   - Go to Application tab
   - Clear Site Data (Storage > Clear site data)

2. **Start Fresh**
   - Restart the dev server: `npm run dev`
   - Navigate to: http://localhost:3000/dashboard/content/new?template=c21b9928-edbe-4204-9aa8-770e2b43b0be

3. **Check Cookies in DevTools**
   - Go to Application tab > Cookies > http://localhost:3000
   - Look for a cookie named `csrf-token`
   - Check its properties:
     - **HttpOnly**: Is it checked? (This is the key!)
     - **Value**: Does it have a value?
     - **Path**: Should be `/`
     - **SameSite**: Should be `Strict`

4. **Check Console Logs**
   When you select a product, you should see:
   ```
   [apiFetch] Method requires CSRF token: POST
   [getCSRFToken] All cookies: ...
   [getCSRFToken] Cookie length: ...
   [getCSRFToken] Parts after split: ...
   [getCSRFToken] Parts length: ...
   [getCSRFToken] Found token: ... OR No CSRF token found in cookies
   [apiFetch] CSRF token retrieved: ...
   [apiFetch] Added CSRF token to headers OR No CSRF token available!
   ```

5. **Check Network Tab**
   - Find the POST request to `/api/content/prepare-product-context`
   - Check Request Headers for `x-csrf-token`
   - Check Response status (403 means no token was sent)

## What to Look For

### If HttpOnly is Checked in Application Tab
- This confirms our hypothesis
- The cookie exists but JavaScript can't read it
- Console will show empty cookies or missing csrf-token

### If HttpOnly is NOT Checked
- We need to investigate further
- Check if the cookie name matches exactly
- Check if there are domain/path issues

### If No csrf-token Cookie Exists
- The middleware might not be setting it
- Check if you're hitting public routes that skip cookie setting
- Check middleware logs

## Report Back With:
1. Screenshot of Application > Cookies showing the csrf-token cookie
2. Console logs when selecting a product
3. Network tab showing the failed request headers