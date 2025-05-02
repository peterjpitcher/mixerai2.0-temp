# MixerAI 2.0 Folder Structure Fix

## Current Issues

The project currently has multiple duplicate directories which is causing confusion:

1. The main project directory is `/Users/peterpitcher/Cursor/MixerAI 2.0a`
2. There is a `src` directory at the root level which duplicates functionality in `mixerai-2.0/src`
3. There is a nested `mixerai-2.0/mixerai-2.0` directory which introduces more duplication

This is causing several problems:
- Scripts fail to run when executed from the wrong directory
- Import paths are confusing and inconsistent
- Different components may import from different places

## Files That Need to Be Moved

After analysis, we've found several files in the root `src` directory that are missing from the `mixerai-2.0/src` directory:

1. `src/app/dashboard/workflows/page.tsx` - Missing from `mixerai-2.0/src/app/dashboard/workflows/`
2. `src/app/api/content/generate/route.ts` - Missing from `mixerai-2.0/src/app/api/content/`

Additional files may need to be checked and moved as well. You should compare all files in these directories:

```bash
# To check differences between directories
diff -r src/app mixerai-2.0/src/app
diff -r src/components mixerai-2.0/src/components
```

## Correct Structure

The intended structure should be:

```
MixerAI 2.0a/               # Root project directory
└── mixerai-2.0/            # Main application directory
    ├── src/                # Source code
    │   ├── app/            # Next.js app
    │   ├── components/     # UI components
    │   ├── lib/            # Utilities
    │   └── types/          # TypeScript types
    ├── public/             # Static assets
    ├── migrations/         # Database migration scripts
    ├── scripts/            # Utility scripts
    └── .next/              # Next.js build output (generated)
```

## Recommended Actions

1. **Run commands from the correct directory:**
   All npm commands and scripts should be run from the `mixerai-2.0` directory:

   ```bash
   cd mixerai-2.0
   npm run dev
   # OR
   ./scripts/use-local-db.sh
   ```

2. **Consolidate duplicate code:**
   - Copy the missing files from the root `src` directory to their counterparts in `mixerai-2.0/src`:
     ```bash
     # Example for workflows page
     mkdir -p mixerai-2.0/src/app/dashboard/workflows
     cp src/app/dashboard/workflows/page.tsx mixerai-2.0/src/app/dashboard/workflows/
     
     # Example for API route
     mkdir -p mixerai-2.0/src/app/api/content/generate
     cp src/app/api/content/generate/route.ts mixerai-2.0/src/app/api/content/generate/
     ```
   - Once confirmed, delete the root `src` directory

3. **Remove the nested `mixerai-2.0/mixerai-2.0` directory:**
   - Check if this contains any unique code
   - If it does, merge it with the appropriate location in `mixerai-2.0/src`
   - Delete the nested directory

4. **Update documentation:**
   - Update the Cursor rules to reflect the correct directory structure
   - Update any READMEs or setup docs to clarify the correct directory structure
   - Add a note to the root README.md instructing users to change to the mixerai-2.0 directory

## Migration Plan

1. First, make a backup of all code that might be lost in the consolidation:
   ```bash
   cp -r src src_backup
   cp -r mixerai-2.0/mixerai-2.0 mixerai2_nested_backup
   ```

2. After backing up, compare files and consolidate unique code:
   ```bash
   # Use tools like diff to compare files
   diff -r src mixerai-2.0/src
   diff -r mixerai-2.0/mixerai-2.0/src mixerai-2.0/src
   ```

3. Once all code is consolidated, remove duplicate directories:
   ```bash
   # Only after confirming all code is preserved
   rm -rf src
   rm -rf mixerai-2.0/mixerai-2.0
   ```

## Other Potential Issues

- Check import paths in all files to ensure they're using the correct paths
- Update any CI/CD configurations to use the correct directory
- Ensure any documentation about running the project mentions the correct directory 