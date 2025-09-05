# MixerAI 2.0 Directory Structure

## Root Directory
- **CLAUDE.md** - AI assistant development guide
- **README.md** - Project overview and setup instructions
- **SECURITY.md** - Security policy
- **Configuration Files** - package.json, tsconfig.json, next.config.js, etc.

## /src
Main source code directory

### /src/app
Next.js App Router pages and API routes
- **/api** - RESTful API endpoints
- **/auth** - Authentication pages
- **/dashboard** - Protected application pages
- **/admin** - Admin-only pages

### /src/components
React components
- **/ui** - Base UI components (shadcn/ui)
- **/content** - Content management components
- **/dashboard** - Dashboard feature components
- **/layout** - Layout and navigation components
- **/providers** - React context providers

### /src/lib
Core utilities and helpers
- **/auth** - Authentication middleware & permissions
- **/azure** - Azure OpenAI integration
- **/supabase** - Database clients
- **/utils** - General utilities
- **/api** - API utilities
- **/hooks** - Custom React hooks

### /src/types
TypeScript type definitions

### /src/hooks
Custom React hooks

## /docs
Project documentation

### /docs/PRD
Product Requirements Documentation
- Executive summary, functional requirements, technical architecture, etc.

### /docs/qa
QA testing documentation
- Test plans, bug reports, testing guidelines

### /docs/qa-issues
QA issue reports and fixes
- Issue tracking, fix reports, response emails

### /docs/project-overview
High-level project documentation
- System overview, architecture decisions

### /docs/setup
Setup and configuration guides

### /docs/api
API documentation

### /docs/communications
Project communications and announcements

## /scripts
Utility scripts for development and maintenance
- Database management scripts
- Testing utilities
- Migration scripts
- Code analysis tools

## /supabase
Supabase configuration
- **/migrations** - Database migration files
- **/functions** - Edge functions

## /email-templates
HTML email templates for transactional emails

## /public
Static assets served by Next.js

## /.archive
Archived files and old backups (gitignored)

## Files to Keep in Root
- Configuration files (package.json, tsconfig.json, etc.)
- Build files (next.config.js, tailwind.config.js)
- Docker files (docker-compose.yml)
- CI/CD files (vercel.json)
- Security files (SECURITY.md)
- Main README.md
- CLAUDE.md (AI assistant guide)

## Ignored Patterns
- .DS_Store files
- *.backup files
- /.archive directory
- /temp, /tmp directories
- Work-in-progress documentation in root
- SQL files in root