# MixerAI 2.0 Deployment Modes

This document explains the two deployment modes available for MixerAI 2.0.

## 1. Full Application Mode

The full Next.js application mode runs the complete MixerAI 2.0 platform with all features. This is the default mode when deploying without any special environment variables.

To run in full application mode:

```bash
# Local development
npm run dev

# Production
npm run build
npm start
```

## 2. Maintenance Mode

Maintenance mode provides a simplified static page with limited API functionality. This is useful when:
- The database is unavailable
- You're performing upgrades or migrations
- You need to take the application offline but keep API endpoints available

To run in maintenance mode:

```bash
# Set the MAINTENANCE_MODE environment variable to true
MAINTENANCE_MODE=true npm start
```

### How Maintenance Mode Works

The `server.js` file checks for the `MAINTENANCE_MODE` environment variable. When set to "true", it:

1. Bypasses the Next.js application
2. Serves a static maintenance page
3. Provides mock API endpoints that return sample data
4. Makes an API tester available at `/api-tester`

### Deploying to Vercel in Maintenance Mode

To deploy in maintenance mode to Vercel:

1. Add an environment variable in the Vercel dashboard:
   - Name: `MAINTENANCE_MODE`
   - Value: `true`

2. Deploy using the current configuration:
   ```bash
   git push origin main
   ```

### Switching Between Modes

To switch from maintenance mode to full application mode:

1. Remove or set the `MAINTENANCE_MODE` environment variable to `false`
2. Redeploy the application

## Implementation Details

The application uses a custom server (`server.js`) that can operate in two modes:

1. **Full Application Mode**: Uses Next.js to serve the complete application
2. **Maintenance Mode**: Uses a simple HTTP server to serve static content and mock APIs

The mode is determined by the `MAINTENANCE_MODE` environment variable. 