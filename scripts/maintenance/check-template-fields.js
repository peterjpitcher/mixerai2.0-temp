#!/usr/bin/env node

/**
 * Script to check content template field structure
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function checkTemplateFields() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get all content templates
    const { data: templates, error } = await supabase
      .from('content_templates')
      .select('id, name, fields')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }
    
    console.log('\n=== Content Templates ===\n');
    
    templates.forEach(template => {
      console.log(`Template: ${template.name} (ID: ${template.id})`);
      
      if (template.fields) {
        console.log('Input Fields:');
        if (template.fields.inputFields) {
          template.fields.inputFields.forEach(field => {
            console.log(`  - ${field.name} (ID: ${field.id}, Type: ${field.type}, Required: ${field.required})`);
          });
        }
        
        console.log('\nOutput Fields:');
        if (template.fields.outputFields) {
          template.fields.outputFields.forEach(field => {
            console.log(`  - ${field.name} (ID: ${field.id})`);
            if (field.aiPrompt) {
              console.log(`    AI Prompt: ${field.aiPrompt.substring(0, 100)}...`);
              // Check for template variables
              const matches = field.aiPrompt.match(/\{\{([^}]+)\}\}/g);
              if (matches) {
                console.log(`    Template Variables: ${matches.join(', ')}`);
              }
            }
          });
        }
      }
      console.log('\n---\n');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTemplateFields();