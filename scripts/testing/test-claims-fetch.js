#!/usr/bin/env node

/**
 * Test script to debug claims fetching issues
 */

require('dotenv').config({ path: '.env.local' });

async function testClaimsFetch() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  
  console.log('Testing claims API...\n');
  
  try {
    // Test 1: Fetch claims with default pagination
    console.log('1. Testing default fetch (50 items):');
    const response1 = await fetch(`${baseUrl}/api/claims`);
    const data1 = await response1.json();
    console.log(`   - Status: ${response1.status}`);
    console.log(`   - Success: ${data1.success}`);
    console.log(`   - Claims returned: ${data1.data?.length || 0}`);
    console.log(`   - Total claims: ${data1.pagination?.total || 'N/A'}`);
    
    // Test 2: Fetch all claims (up to 1000)
    console.log('\n2. Testing fetch with limit=1000:');
    const response2 = await fetch(`${baseUrl}/api/claims?limit=1000`);
    const data2 = await response2.json();
    console.log(`   - Status: ${response2.status}`);
    console.log(`   - Success: ${data2.success}`);
    console.log(`   - Claims returned: ${data2.data?.length || 0}`);
    
    // Test 3: Check for different claim levels
    console.log('\n3. Claims by level:');
    if (data2.data && Array.isArray(data2.data)) {
      const byLevel = data2.data.reduce((acc, claim) => {
        acc[claim.level] = (acc[claim.level] || 0) + 1;
        return acc;
      }, {});
      console.log(`   - Brand claims: ${byLevel.brand || 0}`);
      console.log(`   - Product claims: ${byLevel.product || 0}`);
      console.log(`   - Ingredient claims: ${byLevel.ingredient || 0}`);
    }
    
    // Test 4: Check for claims with missing data
    console.log('\n4. Data integrity check:');
    if (data2.data && Array.isArray(data2.data)) {
      const missingData = data2.data.filter(claim => {
        if (claim.level === 'brand' && !claim.master_brand_id) return true;
        if (claim.level === 'product' && !claim.product_id) return true;
        if (claim.level === 'ingredient' && !claim.ingredient_id) return true;
        return false;
      });
      console.log(`   - Claims with missing entity references: ${missingData.length}`);
      
      if (missingData.length > 0) {
        console.log('   - First 5 problematic claims:');
        missingData.slice(0, 5).forEach(claim => {
          console.log(`     * ${claim.id}: ${claim.level} claim missing ${claim.level}_id`);
        });
      }
    }
    
    // Test 5: Direct database query (requires database connection)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('\n5. Direct database count:');
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { count: totalCount } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   - Total claims in database: ${totalCount}`);
      
      // Check junction tables
      const { count: productCount } = await supabase
        .from('claim_products')
        .select('*', { count: 'exact', head: true });
      
      const { count: countryCount } = await supabase
        .from('claim_countries')
        .select('*', { count: 'exact', head: true });
      
      console.log(`   - Entries in claim_products: ${productCount}`);
      console.log(`   - Entries in claim_countries: ${countryCount}`);
    }
    
  } catch (error) {
    console.error('Error testing claims API:', error);
  }
}

// Run the test
testClaimsFetch();