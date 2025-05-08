-- Content Template System Migration
-- Created for the feature/content-system-renovation branch

-- Create the content_templates table
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  fields JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE content_templates IS 'Stores content template definitions with customizable fields';

-- Add index for faster searching
CREATE INDEX IF NOT EXISTS idx_content_templates_name ON content_templates (name);

-- Modify the content table to support templates
ALTER TABLE content
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES content_templates(id),
ADD COLUMN IF NOT EXISTS content_data JSONB,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS published_version INTEGER;

-- Add indexes on the new columns
CREATE INDEX IF NOT EXISTS idx_content_template_id ON content (template_id);

-- Create initial template types to replace the hardcoded ones
INSERT INTO content_templates (name, description, fields, created_at, updated_at)
VALUES 
(
  'Basic Article', 
  'A simple article template with title, body, and metadata', 
  '{
    "inputFields": [
      {
        "id": "title",
        "name": "Title",
        "type": "shortText",
        "required": true,
        "options": {
          "minLength": 10,
          "maxLength": 100
        },
        "aiSuggester": false
      },
      {
        "id": "keywords",
        "name": "Keywords",
        "type": "tags",
        "required": true,
        "options": {
          "maxTags": 10
        },
        "aiSuggester": true,
        "aiPrompt": "Generate up to 10 keywords for an article with the title: {{title}}"
      },
      {
        "id": "brief",
        "name": "Brief",
        "type": "longText",
        "required": true,
        "options": {
          "minWords": 50,
          "maxWords": 200
        },
        "aiSuggester": false
      }
    ],
    "outputFields": [
      {
        "id": "content",
        "name": "Content",
        "type": "richText",
        "aiAutoComplete": true,
        "aiPrompt": "Generate an article with the title: {{title}}. Keywords: {{keywords}}. Brief: {{brief}}. The article should be around 800 words."
      },
      {
        "id": "metaDescription",
        "name": "Meta Description",
        "type": "plainText",
        "options": {
          "maxLength": 160
        },
        "aiAutoComplete": true,
        "aiPrompt": "Generate a compelling meta description (max 160 characters) for an article with the title: {{title}}. Brief: {{brief}}"
      }
    ]
  }',
  NOW(),
  NOW()
),
(
  'Product Description', 
  'Template for creating product descriptions with features and benefits', 
  '{
    "inputFields": [
      {
        "id": "productName",
        "name": "Product Name",
        "type": "shortText",
        "required": true,
        "options": {
          "maxLength": 100
        },
        "aiSuggester": false
      },
      {
        "id": "productCategory",
        "name": "Product Category",
        "type": "select",
        "required": true,
        "options": {
          "choices": ["Electronics", "Clothing", "Home", "Beauty", "Food", "Other"]
        },
        "aiSuggester": false
      },
      {
        "id": "keyFeatures",
        "name": "Key Features",
        "type": "longText",
        "required": true,
        "aiSuggester": true,
        "aiPrompt": "List 5-7 key features for a product called {{productName}} in the {{productCategory}} category."
      },
      {
        "id": "targetAudience",
        "name": "Target Audience",
        "type": "shortText",
        "required": true,
        "aiSuggester": true,
        "aiPrompt": "Suggest a target audience for a product called {{productName}} in the {{productCategory}} category."
      }
    ],
    "outputFields": [
      {
        "id": "shortDescription",
        "name": "Short Description",
        "type": "plainText",
        "options": {
          "maxLength": 200
        },
        "aiAutoComplete": true,
        "aiPrompt": "Write a compelling short description (max 200 characters) for a product called {{productName}} in the {{productCategory}} category with these key features: {{keyFeatures}}. Target audience: {{targetAudience}}."
      },
      {
        "id": "fullDescription",
        "name": "Full Description",
        "type": "richText",
        "aiAutoComplete": true,
        "aiPrompt": "Write a detailed product description for {{productName}} in the {{productCategory}} category. Include these key features: {{keyFeatures}}. The description should appeal to {{targetAudience}} and include benefits, use cases, and a compelling reason to buy. Format with headings, bullet points for features, and emphasize the key selling points."
      },
      {
        "id": "specifications",
        "name": "Specifications",
        "type": "html",
        "aiAutoComplete": true,
        "aiPrompt": "Generate an HTML table with specifications for {{productName}} based on these features: {{keyFeatures}}. Include rows for dimensions, materials, and other relevant specifications inferred from the product category {{productCategory}}."
      }
    ]
  }',
  NOW(),
  NOW()
); 