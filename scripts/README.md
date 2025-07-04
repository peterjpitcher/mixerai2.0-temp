# Scripts Directory

Utility scripts for development, testing, and maintenance of MixerAI 2.0.

## Available Scripts

### Development & Testing
- `test-azure-openai.js` - Test Azure OpenAI API connectivity
- `test-db-connection.js` - Test database connectivity
- `test-auth-flow.js` - Test authentication flow

### Database Management
- `init-database.sh` - Initialize database with schema
- `reset-database.sh` - Reset database to clean state
- `generate-embeddings.js` - Generate embeddings for content

### Code Quality
- `check-code-patterns.sh` - Check for code anti-patterns
- `test-cors.sh` - Test CORS configuration

## Usage

Most scripts can be run directly with Node.js or bash:

```bash
# Node.js scripts
node scripts/test-db-connection.js

# Bash scripts
./scripts/init-database.sh
```

## Environment Requirements

Scripts expect the following environment variables to be set:
- Database scripts: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Azure scripts: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`
- Auth scripts: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Adding New Scripts

1. Place script in appropriate category
2. Add clear description at the top of the file
3. Include error handling and validation
4. Update this README with the new script
5. Make executable if bash script: `chmod +x script.sh`