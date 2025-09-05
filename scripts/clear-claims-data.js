#!/usr/bin/env node

/**
 * Script to clear all claims-related data from the database
 * WARNING: This will permanently delete all claims, products, ingredients, and related data!
 * 
 * Usage: node scripts/clear-claims-data.js [--confirm]
 * Add --confirm flag to actually execute the deletion (otherwise it runs in dry-run mode)
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Check if --confirm flag is provided
const isConfirmed = process.argv.includes('--confirm');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Get counts of records that will be deleted
 */
async function getRecordCounts() {
  console.log('\n📊 Analyzing data to be deleted...\n');
  
  const counts = {};
  
  // Count records in each table
  const tables = [
    'claim_workflow_history',
    'claim_countries',
    'claim_ingredients', 
    'claim_products',
    'market_claim_overrides',
    'claims',
    'claims_workflow_steps',
    'claims_workflows',
    'claim_reviews',
    'product_ingredients',
    'products',
    'ingredients',
    'brand_master_claim_brands',
    'master_claim_brands'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.warn(`⚠️  Could not count ${table}: ${error.message}`);
        counts[table] = 'unknown';
      } else {
        counts[table] = count || 0;
      }
    } catch (err) {
      console.warn(`⚠️  Error counting ${table}: ${err.message}`);
      counts[table] = 'error';
    }
  }
  
  return counts;
}

/**
 * Delete all claims-related data
 */
async function clearClaimsData() {
  console.log('\n🗑️  Starting deletion process...\n');
  
  const results = {
    success: [],
    failed: []
  };
  
  // Order matters due to foreign key constraints!
  // Delete in reverse dependency order
  const deletionOrder = [
    // 1. Delete history and junction tables first
    { table: 'claim_workflow_history', name: 'Claim workflow history' },
    { table: 'claim_countries', name: 'Claim countries' },
    { table: 'claim_ingredients', name: 'Claim ingredients' },
    { table: 'claim_products', name: 'Claim products' },
    { table: 'market_claim_overrides', name: 'Market claim overrides' },
    
    // 2. Delete claims
    { table: 'claims', name: 'Claims' },
    
    // 3. Delete workflow-related tables
    { table: 'claims_workflow_steps', name: 'Claims workflow steps' },
    { table: 'claims_workflows', name: 'Claims workflows' },
    
    // 4. Delete reviews
    { table: 'claim_reviews', name: 'Claim reviews' },
    
    // 5. Delete product/ingredient relationships
    { table: 'product_ingredients', name: 'Product ingredients' },
    
    // 6. Delete products and ingredients
    { table: 'products', name: 'Products' },
    { table: 'ingredients', name: 'Ingredients' },
    
    // 7. Delete brand-master claim relationships
    { table: 'brand_master_claim_brands', name: 'Brand master claim brands' },
    
    // 8. Finally delete master claim brands
    { table: 'master_claim_brands', name: 'Master claim brands' }
  ];
  
  for (const { table, name } of deletionOrder) {
    try {
      console.log(`   Deleting ${name}...`);
      
      const { error, count } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible ID match)
      
      if (error) {
        console.error(`   ❌ Failed to delete ${name}: ${error.message}`);
        results.failed.push({ table, error: error.message });
      } else {
        console.log(`   ✅ Deleted all records from ${name}`);
        results.success.push({ table, name });
      }
    } catch (err) {
      console.error(`   ❌ Error deleting ${name}: ${err.message}`);
      results.failed.push({ table, error: err.message });
    }
  }
  
  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================');
  console.log('  CLAIMS DATA CLEANUP SCRIPT');
  console.log('================================================');
  
  if (!isConfirmed) {
    console.log('\n⚠️  DRY RUN MODE - No data will be deleted');
    console.log('   Add --confirm flag to actually delete data\n');
  } else {
    console.log('\n🚨 PRODUCTION MODE - Data WILL be deleted!\n');
  }
  
  try {
    // Get and display record counts
    const counts = await getRecordCounts();
    
    console.log('📋 Records to be deleted:');
    console.log('--------------------------------');
    
    let totalRecords = 0;
    for (const [table, count] of Object.entries(counts)) {
      const countStr = typeof count === 'number' ? count.toString() : count;
      console.log(`   ${table}: ${countStr}`);
      if (typeof count === 'number') totalRecords += count;
    }
    
    console.log('--------------------------------');
    console.log(`   TOTAL: ${totalRecords} records\n`);
    
    if (totalRecords === 0) {
      console.log('✅ No records to delete. Database is already clean.\n');
      process.exit(0);
    }
    
    if (!isConfirmed) {
      console.log('To execute the deletion, run:');
      console.log('   node scripts/clear-claims-data.js --confirm\n');
      process.exit(0);
    }
    
    // Ask for final confirmation in production mode
    console.log('⚠️  WARNING: This action cannot be undone!');
    console.log('   All claims, products, ingredients, and related data will be permanently deleted.\n');
    
    const confirmed = await askConfirmation('Are you absolutely sure you want to proceed? (yes/no): ');
    
    if (!confirmed) {
      console.log('\n❌ Operation cancelled by user.\n');
      process.exit(0);
    }
    
    // Double confirmation for production
    const doubleConfirmed = await askConfirmation('\n🔴 FINAL CONFIRMATION: Type "yes" to permanently delete all claims data: ');
    
    if (!doubleConfirmed) {
      console.log('\n❌ Operation cancelled by user.\n');
      process.exit(0);
    }
    
    // Execute deletion
    const results = await clearClaimsData();
    
    // Display results
    console.log('\n================================================');
    console.log('  CLEANUP RESULTS');
    console.log('================================================\n');
    
    if (results.success.length > 0) {
      console.log('✅ Successfully cleared:');
      results.success.forEach(({ name }) => {
        console.log(`   - ${name}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed to clear:');
      results.failed.forEach(({ table, error }) => {
        console.log(`   - ${table}: ${error}`);
      });
      
      console.log('\n⚠️  Some operations failed. You may need to manually clear these tables.');
      process.exit(1);
    } else {
      console.log('\n🎉 All claims data has been successfully cleared!');
      console.log('   The database is ready for new claims data.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
main();