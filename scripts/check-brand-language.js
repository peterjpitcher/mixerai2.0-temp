#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBrandLanguage() {
  console.log('Checking brand language and country settings...\n');

  // Fetch all brands
  const { data: brands, error } = await supabase
    .from('brands')
    .select('id, name, language, country');

  if (error) {
    console.error('Error fetching brands:', error);
    return;
  }

  console.log(`Found ${brands.length} brands:\n`);

  for (const brand of brands) {
    console.log(`Brand: ${brand.name}`);
    console.log(`  - Language: ${brand.language || 'NOT SET ❌'}`);
    console.log(`  - Country: ${brand.country || 'NOT SET ❌'}`);
    
    if (!brand.language || !brand.country) {
      console.log(`  ⚠️  This brand is missing language/country settings!`);
      console.log(`  To fix this, run:`);
      console.log(`  UPDATE brands SET language = 'en', country = 'US' WHERE id = '${brand.id}';`);
    }
    console.log('');
  }

  // Count brands missing settings
  const missingSettings = brands.filter(b => !b.language || !b.country);
  if (missingSettings.length > 0) {
    console.log(`\n📊 Summary: ${missingSettings.length} out of ${brands.length} brands are missing language/country settings.`);
    console.log('\n🔧 Quick fix - Update all brands without language/country to English/US:');
    console.log(`
UPDATE brands 
SET 
  language = COALESCE(language, 'en'),
  country = COALESCE(country, 'US')
WHERE language IS NULL OR country IS NULL;
    `);
  } else {
    console.log('\n✅ All brands have language and country settings!');
  }
}

checkBrandLanguage().catch(console.error);