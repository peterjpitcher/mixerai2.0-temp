-- Migration to add description column to workflows table
ALTER TABLE workflows
ADD COLUMN description TEXT NULL; 