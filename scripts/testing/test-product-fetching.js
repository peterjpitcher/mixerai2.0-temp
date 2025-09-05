#!/usr/bin/env node

/**
 * Test script to verify product fetching for brands with multiple master claim brands
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProductFetching() {
  console.log('=== Testing Product Fetching for Brands ===\n');

  try {
    // 1. First, let's get a brand that has master claim brands linked
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .limit(5);

    if (brandsError) {
      console.error('Error fetching brands:', brandsError);
      return;
    }

    console.log(`Found ${brands.length} brands\n`);

    // 2. For each brand, check master claim brand links
    for (const brand of brands) {
      console.log(`\n--- Brand: ${brand.name} (${brand.id}) ---`);
      
      // Get master claim brand links
      const { data: masterBrandLinks, error: linksError } = await supabase
        .from('master_claim_brands')
        .select('id, name')
        .eq('mixerai_brand_id', brand.id);

      if (linksError) {
        console.error('Error fetching master claim brands:', linksError);
        continue;
      }

      console.log(`  Master Claim Brands linked: ${masterBrandLinks.length}`);
      masterBrandLinks.forEach(mcb => {
        console.log(`    - ${mcb.name} (${mcb.id})`);
      });

      if (masterBrandLinks.length === 0) {
        console.log('  ⚠️  No master claim brands linked');
        continue;
      }

      // 3. Get products for these master brands
      const masterBrandIds = masterBrandLinks.map(link => link.id);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name')
        .in('master_brand_id', masterBrandIds)
        .limit(10);

      if (productsError) {
        console.error('  Error fetching products:', productsError);
        continue;
      }

      console.log(`  Products available: ${products.length}`);
      if (products.length > 0) {
        console.log('  Sample products:');
        products.slice(0, 5).forEach(product => {
          console.log(`    - ${product.name}`);
        });
        if (products.length > 5) {
          console.log(`    ... and ${products.length - 5} more`);
        }
      } else {
        console.log('  ⚠️  No products found for linked master claim brands');
      }
    }

    // 4. Also check if there are any master claim brands without a MixerAI brand link
    console.log('\n\n--- Unlinked Master Claim Brands ---');
    const { data: unlinkedMCBs, error: unlinkedError } = await supabase
      .from('master_claim_brands')
      .select('id, name')
      .is('mixerai_brand_id', null)
      .limit(10);

    if (unlinkedError) {
      console.error('Error fetching unlinked master claim brands:', unlinkedError);
    } else {
      console.log(`Found ${unlinkedMCBs.length} unlinked master claim brands`);
      unlinkedMCBs.forEach(mcb => {
        console.log(`  - ${mcb.name} (${mcb.id})`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testProductFetching();