#!/usr/bin/env node

/**
 * Test script to verify content templates are in the database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTemplatesDatabase() {
  console.log('Testing content templates in database...\n');
  
  try {
    // Fetch all templates
    const { data: templates, error } = await supabase
      .from('content_templates')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching templates:', error);
      return;
    }
    
    console.log(`Found ${templates?.length || 0} templates in database\n`);
    
    if (templates && templates.length > 0) {
      templates.forEach(template => {
        console.log(`Template: ${template.name}`);
        console.log(`  ID: ${template.id}`);
        console.log(`  Description: ${template.description || 'No description'}`);
        console.log(`  Created: ${new Date(template.created_at).toLocaleString()}`);
        console.log(`  Fields: ${JSON.stringify(template.fields?.inputFields?.length || 0)} input, ${JSON.stringify(template.fields?.outputFields?.length || 0)} output`);
        console.log('');
      });
    } else {
      console.log('No templates found in the database.');
      console.log('\nTo create templates:');
      console.log('1. Go to Dashboard > Templates');
      console.log('2. Click "Create New Template"');
      console.log('3. Fill in the template details and save');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testTemplatesDatabase();