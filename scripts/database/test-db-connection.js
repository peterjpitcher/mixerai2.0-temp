#!/usr/bin/env node

/**
 * Supabase Connection Test Script for MixerAI 2.0
 * 
 * This script tests the connection to Supabase and provides detailed diagnostics.
 * Run with: node scripts/test-db-connection.js
 */

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Helper to check required environment variables
function checkEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = [];
  const present = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });
  
  return { missing, present };
}

// Create Supabase client with admin privileges
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Main test function
async function testSupabaseConnection() {
  console.log('\n🔍 MixerAI 2.0 Supabase Connection Test\n');
  
  // Check environment variables
  const { missing, present } = checkEnvironmentVariables();
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    console.log('\n⚠️  Please set these variables in your .env file and try again.');
    
    if (present.length > 0) {
      console.log('\n✅ Found these environment variables:');
      present.forEach(varName => console.log(`   - ${varName}`));
    }
    
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set\n');
  
  try {
    console.log('🔌 Connecting to Supabase...');
    const supabase = createSupabaseAdminClient();
    
    // Test connection with a simple query
    console.log('📊 Testing connection with a query to the "brands" table...');
    const startTime = Date.now();
    
    const { data, error, status } = await supabase
      .from('brands')
      .select('id, name')
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log(`\n❌ Query failed (${duration}ms):`);
      console.log('   Error code:', error.code);
      console.log('   Message:', error.message);
      console.log('   Details:', error.details);
      
      if (error.message.includes('auth')) {
        console.log('\n⚠️  This appears to be an authentication issue. Check your service role key.');
      } else if (error.message.includes('relation') || error.message.includes('table')) {
        console.log('\n⚠️  This appears to be a schema issue. Make sure the "brands" table exists.');
      } else if (error.message.includes('connect')) {
        console.log('\n⚠️  This appears to be a connection issue. Check your Supabase URL and internet connection.');
      }
      
      process.exit(1);
    }
    
    console.log(`\n✅ Connection successful! (${duration}ms)`);
    console.log(`   HTTP Status: ${status}`);
    console.log(`   Found ${data?.length || 0} brands`);
    
    if (data && data.length > 0) {
      console.log('   First brand:', data[0].name);
    }
    
    console.log('\n🎉 Your Supabase connection is working correctly!');
  } catch (e) {
    console.log('\n❌ Failed to connect to Supabase:');
    console.log('   Error:', e.message);
    console.log('\n   Stack trace:');
    console.log('   ', e.stack.split('\n')[1].trim());
    
    process.exit(1);
  }
}

// Run the test
testSupabaseConnection(); 