/**
 * Script to analyze query performance and verify index usage
 * Run this before and after applying the performance indexes migration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function measureQueryTime(name, queryFn) {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    return {
      name,
      duration,
      success: true,
      rowCount: result.data?.length || 0,
      error: null
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      duration,
      success: false,
      rowCount: 0,
      error: error.message
    };
  }
}

async function runPerformanceTests() {
  console.log('Running performance analysis on common queries...\n');
  
  const queries = [
    {
      name: 'Content by brand and status',
      fn: () => supabase
        .from('content')
        .select('*')
        .eq('brand_id', '123e4567-e89b-12d3-a456-426614174000')
        .eq('status', 'active')
        .limit(100)
    },
    {
      name: 'Content by brand ordered by date',
      fn: () => supabase
        .from('content')
        .select('*')
        .eq('brand_id', '123e4567-e89b-12d3-a456-426614174000')
        .order('created_at', { ascending: false })
        .limit(100)
    },
    {
      name: 'Workflows by brand and template',
      fn: () => supabase
        .from('workflows')
        .select('*')
        .eq('brand_id', '123e4567-e89b-12d3-a456-426614174000')
        .eq('template_id', '123e4567-e89b-12d3-a456-426614174001')
        .limit(50)
    },
    {
      name: 'User brand permissions check',
      fn: () => supabase
        .from('user_brand_permissions')
        .select('*')
        .eq('user_id', '123e4567-e89b-12d3-a456-426614174002')
        .eq('brand_id', '123e4567-e89b-12d3-a456-426614174000')
        .single()
    },
    {
      name: 'Unread notifications for user',
      fn: () => supabase
        .from('notifications')
        .select('*')
        .eq('user_id', '123e4567-e89b-12d3-a456-426614174002')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20)
    },
    {
      name: 'Pending tasks for user',
      fn: () => supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', '123e4567-e89b-12d3-a456-426614174002')
        .eq('status', 'pending')
        .limit(50)
    },
    {
      name: 'Claims by brand and level',
      fn: () => supabase
        .from('claims')
        .select('*')
        .eq('master_brand_id', '123e4567-e89b-12d3-a456-426614174000')
        .eq('level', 'brand')
        .limit(100)
    },
    {
      name: 'Products by brand',
      fn: () => supabase
        .from('products')
        .select('*')
        .eq('brand_id', '123e4567-e89b-12d3-a456-426614174000')
        .limit(100)
    }
  ];

  const results = [];
  
  for (const query of queries) {
    const result = await measureQueryTime(query.name, query.fn);
    results.push(result);
    
    console.log(`✓ ${result.name}`);
    console.log(`  Duration: ${result.duration}ms`);
    if (result.success) {
      console.log(`  Rows: ${result.rowCount}`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
    console.log('');
  }
  
  // Summary
  console.log('\n=== PERFORMANCE SUMMARY ===');
  console.log(`Total queries tested: ${results.length}`);
  console.log(`Successful queries: ${results.filter(r => r.success).length}`);
  console.log(`Failed queries: ${results.filter(r => !r.success).length}`);
  
  const successfulQueries = results.filter(r => r.success);
  if (successfulQueries.length > 0) {
    const avgDuration = successfulQueries.reduce((sum, r) => sum + r.duration, 0) / successfulQueries.length;
    const maxDuration = Math.max(...successfulQueries.map(r => r.duration));
    const minDuration = Math.min(...successfulQueries.map(r => r.duration));
    
    console.log(`\nQuery Time Statistics:`);
    console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  Min: ${minDuration}ms`);
    
    console.log(`\nSlowest queries:`);
    results
      .filter(r => r.success)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .forEach(r => {
        console.log(`  - ${r.name}: ${r.duration}ms`);
      });
  }
  
  // Save results to file for comparison
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `query-performance-${timestamp}.json`;
  require('fs').writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${filename}`);
}

// Check for existing indexes
async function checkExistingIndexes() {
  console.log('\n=== CHECKING EXISTING INDEXES ===\n');
  
  try {
    // This query checks for indexes on key tables
    const { data, error } = await supabase.rpc('get_table_indexes', {
      table_names: ['content', 'workflows', 'user_brand_permissions', 'notifications', 'user_tasks', 'claims']
    }).single();
    
    if (error) {
      console.log('Note: Could not fetch index information (function may not exist)');
      return;
    }
    
    if (data) {
      console.log('Existing indexes found:');
      console.log(data);
    }
  } catch (error) {
    console.log('Note: Could not fetch index information');
  }
}

async function main() {
  console.log('Database Query Performance Analyzer');
  console.log('===================================\n');
  
  await checkExistingIndexes();
  await runPerformanceTests();
  
  console.log('\n✅ Analysis complete!');
  console.log('\nNext steps:');
  console.log('1. Run the migration: ./scripts/run-migrations.sh');
  console.log('2. Run this script again to compare performance');
  console.log('3. Compare the JSON output files to measure improvement');
}

main().catch(console.error);