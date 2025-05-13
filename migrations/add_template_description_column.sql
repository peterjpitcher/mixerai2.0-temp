-- Migration to add description column to content_templates table
ALTER TABLE content_templates
ADD COLUMN description TEXT NULL; 