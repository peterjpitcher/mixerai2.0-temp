#!/usr/bin/env node

/**
 * Diagnostic script to check template generation issues
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseTemplate(templateName = 'PDP') {
  console.log(`\n🔍 Diagnosing template: ${templateName}\n`);
  
  try {
    
    // Find the template
    const { data: templates, error: templateError } = await supabase
      .from('content_templates')
      .select('*')
      .ilike('name', `%${templateName}%`);
    
    // Debug: show all columns
    if (templates && templates.length > 0) {
      console.log('\n📊 Available columns:', Object.keys(templates[0]));
    }
    
    if (templateError) throw templateError;
    
    if (!templates || templates.length === 0) {
      console.log(`❌ No template found matching "${templateName}"`);
      return;
    }
    
    const template = templates[0];
    console.log(`✅ Found template: ${template.name} (ID: ${template.id})`);
    console.log(`📝 Description: ${template.description || 'No description'}`);
    
    // Debug: Show raw fields
    console.log('\n🔍 Raw template data:');
    console.log('- fields type:', typeof template.fields);
    
    // Parse fields - they're in a single 'fields' column
    let fields = {};
    if (typeof template.fields === 'string') {
      fields = JSON.parse(template.fields);
    } else {
      fields = template.fields || {};
    }
    
    const inputFields = fields.inputFields || [];
    const outputFields = fields.outputFields || [];
    
    console.log(`\n📥 Input Fields (${inputFields.length}):`);
    inputFields.forEach((field, i) => {
      console.log(`  ${i + 1}. ${field.name} (${field.id})`);
      console.log(`     - Type: ${field.type}`);
      console.log(`     - Required: ${field.required}`);
      if (field.aiPrompt) {
        console.log(`     - AI Prompt: ${field.aiPrompt.substring(0, 100)}...`);
      }
    });
    
    console.log(`\n📤 Output Fields (${outputFields.length}):`);
    outputFields.forEach((field, i) => {
      console.log(`  ${i + 1}. ${field.name} (${field.id})`);
      console.log(`     - Type: ${field.type}`);
      console.log(`     - AI Auto-complete: ${field.aiAutoComplete}`);
      if (field.aiPrompt) {
        console.log(`     - AI Prompt: "${field.aiPrompt}"`);
      }
      console.log(`     - Use Brand Identity: ${field.useBrandIdentity}`);
      console.log(`     - Use Tone of Voice: ${field.useToneOfVoice}`);
      console.log(`     - Use Guardrails: ${field.useGuardrails}`);
    });
    
    // Look specifically for manufacturer copy
    const manufacturerField = outputFields.find(f => 
      f.name.toLowerCase().includes('manufacturer') || 
      f.id.toLowerCase().includes('manufacturer')
    );
    
    if (manufacturerField) {
      console.log(`\n🎯 Manufacturer Copy Field Details:`);
      console.log(JSON.stringify(manufacturerField, null, 2));
    } else {
      console.log(`\n⚠️  No field found with "manufacturer" in name or ID`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the diagnostic
const templateName = process.argv[2] || 'PDP';
diagnoseTemplate(templateName);